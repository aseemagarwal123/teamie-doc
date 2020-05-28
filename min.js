jQuery(function($) {
  var query = (function parseQuery() {
    var query = {};
    var temp = window.location.search.substring(1).split('&');
    for (var i = temp.length; i--;) {
      var q = temp[i].split('=');
      query[q.shift()] = decodeURIComponent(q.join('='));
    }
    return query;
  })();

  // setup -- you probably already have this, so you can ignore it
  function createSession(data) {
    if (data.viewingSessionId) {
      return data.viewingSessionId;
    }

    return $.ajax({
      url: sampleConfig.imageHandlerUrl + '/ViewingSession',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data)
    }).then(function(response) {
      return response.viewingSessionId || response.documentID;
    });
  }

  function getTemplate(templateName) {
    return $.ajax({
        url: templateName
      })
      .then(function(response) {
        return response;
      });
  }

  function getJson(fileName) {
    return $.ajax({
        url: fileName
      })
      .then(function(response) {
        // IIS Express will not use the correct MIME type for json, so we may need to parse it as a string
        if (typeof response === 'string') {
          return JSON.parse(response);
        }

        return response;
      });
  }

  function getDocumentSource(documentQuery) {
    var source = {};

    if (documentQuery && documentQuery.search(/^https?:\/\//) === 0) {
      source.type = 'url';
      source.url = documentQuery;
    } else {
      source.type = 'document';
      source.fileName = documentQuery || 'PdfDemoSample.pdf';
    }

    return source;
  }

  function getResourcesAndEmbedViewer(demoConfig) {
    var sessionData = {};

    if (query.viewingSessionId) {
      sessionData.viewingSessionId = query.viewingSessionId;
    } else {
      sessionData.source = getDocumentSource(query.document);
    }

    $.when(
        sessionData.document, // args[0]
        createSession(sessionData), // args[1]
        window.viewerCustomizations.template, // args[2]
        window.viewerCustomizations.languages['en-US'],//args[3]
        getJson('redactionReason.json'), // args[4]
        getJson('predefinedSearch.json'), // args[5]
        demoConfig.options || {}) // args[6]
      .done(buildViewerOptions);
  }

  function buildViewerOptions() {
    var args = [].slice.call(arguments);

    var optionsOverride = args.pop(); // always last arg

    var options = {
      annotationsMode: "LayeredAnnotations",
      documentID: encodeURIComponent(args[1]),
      language: args[3],
      predefinedSearch: args[5],
      template: args[2],
      viewerAssetsPath: 'viewer-assets',
      icons: window.viewerCustomizations.icons,
      signatureCategories: 'Signature,Initials,Title',
      immediateActionMenuMode: 'hover',
      redactionReasons: args[4],
      documentDisplayName: args[0],
      uiElements: {
        viewTab: false,
        redactTab: false,
        esignTab: false,
        download: getQueryParams()['downloadable'] == 'true',
        fullScreenOnInit: true,
        advancedSearch: true,
        attachments: true
      },
      discardOutOfViewText: true
    };

    var combinedOptions = _.extend(optionsOverride, options);

    embedViewer(combinedOptions);
  }

  var viewerControl;
  var isCommentPanelOpen = false;

  function embedViewer(options) {
    var viewer = $('#viewer').pccViewer(options);
    viewerControl = viewer.viewerControl;
    viewerControl.on('ViewerReady', function() {
      getAllAnnotations();
      printEventListener();
      setDefaultAnnotationStyles();
      // hides prizm doc version
      $('.pccPageListContainerWrapper > div > div:last-child').hide();
    });
  }

  function getAllAnnotations() {
    // Gets a list of all saved markups layer records from the server for the current document
    // annotation name will be user name
    viewerControl.requestMarkupLayerNames().then(
      function onResolve(annotationLayerRecords) {
        var queryParams = getQueryParams();
        var myLayerName = queryParams['name']; // this will be username
        var myLayer = _.find(annotationLayerRecords, function(record) {
          return record.name === myLayerName
        });
        if (_.isUndefined(myLayer)) {
          createNewLayer(myLayerName, queryParams['uid']);
        }
        for (var i = 0; i < annotationLayerRecords.length; i++) {
          if (myLayer && annotationLayerRecords[i].layerRecordId === myLayer.layerRecordId) {
            loadMyAnnotation(myLayer.layerRecordId);
          } else {
            loadOtherAnnotations(annotationLayerRecords[i].layerRecordId)
          }
        }
      },
      function onReject(reason) {
        console.warn('request markup layer rejected');
      }
    );
  }

  function loadMyAnnotation(layerRecordId) {
    viewerControl.loadMarkupLayers(layerRecordId).then(
      function onResolve(annotationLayers) {
        viewerControl.setActiveMarkupLayer(annotationLayers[0]);
        registerLayerMarkEvents(annotationLayers[0]);
        setTimeout(function() {
          registerMarkEvents();
          registerCommentEvents();
        }, 1000);
        saveGlobal();
        checkLayerHasComments(annotationLayers[0]);
      },
      function onReject(reason) {
        console.warn('load markup layer rejected');
      }
    );
  }

  function openComments() {
    if (!viewerControl.getIsCommentsPanelOpen()) {
      $('[data-pcc-comments-panel]').trigger('click');
    }
  }

  function loadOtherAnnotations(layerRecordId) {
    viewerControl.loadMarkupLayers(layerRecordId).then(
      function onResolve(annotationLayers) {
        disableAllLayerMarks(annotationLayers[0]);
        checkLayerHasComments(annotationLayers[0]);
      },
      function onReject(reason) {
        console.warn('load markup layer rejected');
      }
    );
  }

  function disableAllLayerMarks(layer) {
    _.forEach(layer.getMarks(), function(mark) {
      // Store the original interaction mode in the mark's data so it can be restored later if the layer is merged to the current layer.
      // Note that it is necessary to use the setData method here instead of the setSessionData method because the copyLayers method
      // might be used later and it does not copy session data. It is okay to use the setData method in this case since the viewer
      // never saves marks that are loaded for review.
      var originalInteractionMode = mark.getInteractionMode();
      mark.setData('Accusoft-originalInteractionMode', originalInteractionMode);
      mark.setInteractionMode(PCCViewer.Mark.InteractionMode.SelectionDisabled);
    });
  }

  function checkLayerHasComments(layer) {
    _.forEach(layer.getMarks(), function(mark) {
      if (mark.getConversation().getComments().length > 0 && isCommentPanelOpen === false) {
        isCommentPanelOpen = true;
        openComments();
      }
    });
  }

  function saveLayerWithId(layerId, isActiveLayer) {
    var loadSpinnerDom = $('#loadingSpinner');
    var statusMessageDom = $('#statusMessage');
    loadSpinnerDom.removeClass('pcc-hide-lg');
    loadSpinnerDom.removeClass('pcc-hide');
    statusMessageDom.addClass('pcc-hide-lg');
    statusMessageDom.addClass('pcc-hide');
    viewerControl.saveMarkupLayer(layerId).then(
      function onSuccess(layerInfo) {
        loadSpinnerDom.addClass('pcc-hide-lg');
        loadSpinnerDom.addClass('pcc-hide');
        statusMessageDom.removeClass('pcc-hide-lg');
        statusMessageDom.removeClass('pcc-hide');
        statusMessageDom.text('Saved');
        if (isActiveLayer) {
          loadMyAnnotation(layerInfo.layerRecordId);
        }
      },
      function onFailure(reason) {
        console.warn('layer failed to save:', reason.code, reason.message);
        loadSpinnerDom.addClass('pcc-hide-lg');
        loadSpinnerDom.addClass('pcc-hide');
        statusMessageDom.removeClass('pcc-hide-lg');
        statusMessageDom.removeClass('pcc-hide');
        statusMessageDom.text('Save Failed');
      }
    );
  }

  function createNewLayer(layerName, uid) {
    var activeLayer = viewerControl.getActiveMarkupLayer();
    activeLayer.setName(layerName);
    activeLayer.setData('name', layerName);
    activeLayer.setData('uid', uid);
    saveLayerWithId(activeLayer.getId(), true);
    return activeLayer;
  }

  function registerLayerMarkEvents(layer) {
    layer
      .on(PCCViewer.MarkupLayer.EventType.MarksAddedToLayer, function(ev) {
        ev.marks[0].setData('uid', getQueryParams()['uid']);
        ev.marks[0].setData('name', getQueryParams()['name']);
        saveLayerWithId(layer.getId());
      })
      .on(PCCViewer.MarkupLayer.EventType.MarksRemovedFromLayer, function(ev) {
        saveLayerWithId(layer.getId());
      });
  }

  function registerMarkEvents() {
    viewerControl.on('MarkChanged', function(data) {
      saveLayerWithId(viewerControl.getActiveMarkupLayer().getId());
    });
  }

  function registerCommentEvents() {
    viewerControl.on('CommentChanged', function(data) {
      data.comment.setData('uid', getQueryParams()['uid']);
      data.comment.setData('name', getQueryParams()['name']);
      saveLayerWithId(viewerControl.getActiveMarkupLayer().getId());
    });
    viewerControl.on('CommentRemoved', function(data) {
      saveLayerWithId(viewerControl.getActiveMarkupLayer().getId());
    });
  }

  function printEventListener() {
    $('#downloadWithComments').on('click', function(e) {
      if ($('[data-pcc-print="submit"]').is(':visible')) {
        $('[data-pcc-print="submit"]').click();
      }
    });
  }

  var isOnLoad = true;

  function saveGlobal() {
    if (isOnLoad) {
      var saveIcon = $('.pcc-icon.pcc-icon-save');
      saveIcon.addClass('pcc-show');
      saveIcon.click();
      saveIcon.removeClass('pcc-show');
      saveIcon.addClass('pcc-hide');
    }
    isOnLoad = false;
  }

  function setDefaultAnnotationStyles() {
    changeAnnotationForType('rectangle');
    changeAnnotationForType('ellipse');
    changeAnnotationForType('text');
  }

  function changeAnnotationForType(type) {
    var mouseTool = getMouseToolForAnnotation(type);
    var template = mouseTool.getTemplateMark();

    switch (type) {
      case 'rectangle':
        {
          template.setFillColor('transparent');
          template.setBorderThickness(2);
          template.setBorderColor('#FF0000');
          break;
        }
      case 'ellipse':
        {
          template.setFillColor('transparent');
          template.setBorderThickness(2);
          template.setBorderColor('#FF0000');
          break;
        }
      case 'text':
        {
          // template.setFillColor('transparent'); results in text overlap while editing
          template.setFillColor('#FFFFFF');
          template.setOpacity(25);
          template.setBorderThickness(1);
          break;
        }
    }

    mouseTool.templateMark = template;
  }

  function getMouseToolForAnnotation(type) {
    var mouseTool;
    switch (type) {
      case 'rectangle':
        {
          mouseTool = PCCViewer.MouseTools.getMouseTool('AccusoftRectangleAnnotation');
          break;
        }
      case 'ellipse':
        {
          mouseTool = PCCViewer.MouseTools.getMouseTool('AccusoftEllipseAnnotation');
          break;
        }
      case 'text':
        {
          mouseTool = PCCViewer.MouseTools.getMouseTool('AccusoftTextAnnotation');
          break;
        }
    }
    return mouseTool;
  }

  function getQueryParams() {
    var queryParams = decodeURIComponent(window.location.search.substring(1));
    var queries = queryParams.split('&');
    var queryMap = {};
    for (var i = 0; i < queries.length; i++) {
      var pair = queries[i].split('=');
      queryMap[pair[0]] = pair[1];
    }
    return queryMap;
  }

  getResourcesAndEmbedViewer({
    options: {
      imageHandlerUrl: sampleConfig.imageHandlerUrl,
      resourcePath: sampleConfig.viewerAssetsPath + '/img'
    }
  });

});
