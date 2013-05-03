function PunkAveFileUploader(options)
{
  var self = this,
    uploadUrl = options.uploadUrl,
    viewUrl = options.viewUrl,
    $el = $(options.el),
    uploaderTemplate = _.template($('#file-uploader-template').html());
  $el.html(uploaderTemplate({}));

  var fileTemplate = _.template($('#file-uploader-file-template').html()),
    editor = $el.find('[data-files="1"]'),
    thumbnails = $el.find('[data-thumbnails="1"]');
  
  self.uploading = false;
  
  self.errorCallback = 'errorCallback' in options ? options.errorCallback : function( info ) { if (window.console && console.log) { console.log(info) } },

  self.addExistingFiles = function(files)
  {
    _.each(files, function(file) {
      appendEditableImage({
        // cmsMediaUrl is a global variable set by the underscoreTemplates partial of MediaItems.html.twig
        'thumbnail_url': viewUrl + '/thumbnails/' + file,
        'url': viewUrl + '/originals/' + file,
        'name': file
        });
    });
  };

  // Delay form submission until upload is complete.
  // Note that you are welcome to examine the
  // uploading property yourself if this isn't
  // quite right for you
  self.delaySubmitWhileUploading = function(sel)
  {
    $(sel).submit(function(e) {
        if (!self.uploading)
        {
            return true;
        }
        function attempt()
        {
            if (self.uploading)
            {
                setTimeout(attempt, 100);
            }
            else
            {
                $(sel).submit();
            }
        }
        attempt();
        return false;
    });
  }

  if (options.blockFormWhileUploading)
  {
    self.blockFormWhileUploading(options.blockFormWhileUploading);
  }

  if (options.existingFiles)
  {
    self.addExistingFiles(options.existingFiles);
  }

  editor.fileupload({
    dataType: 'json',
    url: uploadUrl,
    dropZone: $el.find('[data-dropzone="1"]'),
    done: function (e, data) {

      var oFilesTable = $('table.drawFilesDataTable').dataTable();
      oFilesTable.fnDestroy();

      if (data)
      {
        _.each(data.result, function(item) {
          appendEditableImage(item);
        });
      }

      drawFilesDataTable($('table.drawFilesDataTable'));
    },
    start: function (e) {
      $el.find('[data-spinner="1"]').show();
      self.uploading = true;
    },
    stop: function (e) {
      $el.find('[data-spinner="1"]').hide();
      self.uploading = false;
    }
  });

  // Expects thumbnail_url, url, and name properties. thumbnail_url can be undefined if
  // url does not end in gif, jpg, jpeg or png. This is designed to work with the
  // result returned by the UploadHandler class on the PHP side
  function appendEditableImage(info)
  {
    if (info.error)
    {
      self.errorCallback(info);
      return;
    }
    var item = $(fileTemplate(info));
    item.find('[data-action="delete"]').click(function(event) {
      //console.log($(this));
      var link = $(this);
      var file = link.closest('[data-name]');
      var name = file.attr('data-name');
      //dialogConfirm("Delete File", "Are you sure you want to delete this file?");
      if ( $('body').find('div#dialog-confirm').length != 0) {
      $('#dialog-confirm').html('');
      $('#dialog-confirm').attr('title', 'Delete File');
      $('#dialog-confirm').html('<p>Are you sure you want to delete this file?<br/><strong>'+name+'</strong></p>');
      } else {
        $('body').append('<div id="dialog-confirm" title="Delete File"><p>Are you sure you want to delete this file?<br/><strong>'+name+'</strong></p></div>');
      }
      $( "#dialog-confirm" ).dialog({
            resizable: false,
            width: 300,
            modal: true,
            buttons: {
                "Delete": function() {
                    $( this ).dialog( "close" );
                    var oFilesTable = $('table.drawFilesDataTable').dataTable();
                    oFilesTable.fnDestroy();

                    $.ajax({
                      type: 'delete',
                      url: setQueryParameter(uploadUrl, 'file', name),
                      success: function() {
                        file.remove();
                        drawFilesDataTable($('table.drawFilesDataTable'));
                      },
                      dataType: 'json'
                    });
                    //return false;
                },
                Cancel: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
    });

    thumbnails.append(item);
  }

  function setQueryParameter(url, param, paramVal)
  {
    var newAdditionalURL = "";
    var tempArray = url.split("?");
    var baseURL = tempArray[0];
    var additionalURL = tempArray[1]; 
    var temp = "";
    if (additionalURL)
    {
        var tempArray = additionalURL.split("&");
        var i;
        for (i = 0; i < tempArray.length; i++)
        {
            if (tempArray[i].split('=')[0] != param )
            {
                newAdditionalURL += temp + tempArray[i];
                temp = "&";
            }
        }
    }
    var newTxt = temp + "" + param + "=" + encodeURIComponent(paramVal);
    var finalURL = baseURL + "?" + newAdditionalURL + newTxt;
    return finalURL;
  }
}


