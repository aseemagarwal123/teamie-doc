
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>Teamie Viewer</title>
    <link rel="icon" href="favicon.ico" type="image/x-icon"/>

    <link rel="stylesheet" href="viewer-assets/css/normalize.min.css"/>
    <link rel="stylesheet" href="viewer-assets/css/viewer.css"/>
    <!-- <link rel="stylesheet" href="viewer-assets/css/viewercontrol.css"> -->
    <link rel="stylesheet" href="./min.css"/>
 
    <script src="viewer-assets/js/jquery-3.4.1.min.js"></script>
    <script src="viewer-assets/js/jquery.hotkeys.min.js"></script>
    <script src="viewer-assets/js/underscore.min.js"></script>
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js"></script>
    <script src="viewer-assets/js/jquery.hotkeys.min.js"></script>
    <script src="viewer-assets/js/viewerCustomizations.js"></script>
    <!--[if lt IE 9]>
        <link rel="stylesheet" href="viewer-assets/css/legacy.css">
        <script src="viewer-assets/js/html5shiv.js"></script>
    <![endif]-->

    <script src="viewer-assets/js/viewercontrol.js"></script>
    <script src="viewer-assets/js/viewer.js"></script>

    <!-- Configuration information used for this sample. -->
   <script src="sample-config.js"></script>
   <script type="text/javascript">
        var PCCViewer = window.PCCViewer || {};
        window.tpls = <?php echo json_encode($tpls) ?>;
    </script>

    <!-- <script type="text/javascript">
    $(function() {
    $('#viewer').pccViewer({
            documentID: 'uIFEFPTIFvEb7-b4gptFfQleJz227bLhkDYtjGsypDS0Hr05YHiQDyJIFmt0GzGjKHcyHSRtyjzFU8hn-Z0zRiQ',
            imageHandlerUrl: 'viewer-webtier/pas.php',
            viewerAssetsPath: 'viewer-assets',
            language: window.viewerCustomizations.languages['en-US'],
            template: window.viewerCustomizations.template,
            icons: window.viewerCustomizations.icons,
            annotationsMode: 'LayeredAnnotations'
          });
        });
</script> -->



</head>
<body>
    <div class="viewerWrapper">
        <div id="viewer"></div>
    </div>

    <div id="attachments" style="display:none;">
        <b>Attachments:</b>
        <p id="attachmentList">
        </p>
    </div>

    <script src="./min.js"></script>
</body>
</html>
