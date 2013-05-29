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
  
  self.errorCallback = 'errorCallback' in options ? options.errorCallback : function( info ) { 
    if (window.console && console.log) { 
      console.log(info) 
    } 
    if (info.error = "acceptFileTypes"){
      //alert(info.name);
      if ( $('body').find('div#dialog-confirm').length != 0) {
        $('#dialog-confirm').html('');
        $('#dialog-confirm').attr('title', 'Upload Error');
        $('#dialog-confirm').html('<p>The upload of <strong>'+info.name+'</strong> failed because <strong>'+info.type+' files</strong> cannot be uploaded to Quadrant.</p>');
      } else {
        $('body').append('<div id="dialog-confirm" title="Upload Error"><p>The upload of <strong>'+info.name+'</strong> failed because <strong>'+info.type+' files</strong> cannot be uploaded to Quadrant.</p></div>');
      }
      $( "#dialog-confirm" ).dialog({
          resizable: false,
          width: 300,
          modal: true,
          buttons: {
            "OK": function() {
              $( this ).dialog( "close" );
            }
          }
      });
    }
  },

  self.addExistingFiles = function(files, sizes, modified, accessed, created)
  {
    /*console.log(files);
    console.log(sizes);
    console.log(modified);
    console.log(accessed);
    console.log(created);*/
    _.each(files, function(file, index) {
      appendEditableImage({
        // cmsMediaUrl is a global variable set by the underscoreTemplates partial of MediaItems.html.twig
        'thumbnail_url': viewUrl + '/thumbnails/' + files[index],
        'url': viewUrl + '/originals/' + files[index],
        'name': files[index],
        'size': sizes[index],
        'lastModified': modified[index]
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
    //console.log(options);
    self.addExistingFiles(options.existingFiles, options.existingFileSizes, options.existingFileMTimes, options.existingFileATimes, options.existingFileCTimes);
  }

  editor.fileupload({
    dataType: 'json',
    url: uploadUrl,
    dropZone: $el.find('[data-dropzone="1"]'),
    progressInterval: 100, 
    maxChunkSize: 1024000,
    // can use the following line to append extra form data in an array or object
    //formData: {example: 'test'},
    add: function (e, data) {
        var fileName = data.files[0].name;
        var xhr = data.submit()
            .success(function (result, textStatus, jqXHR) { 
              //console.log(jqXHR);
            })
            .error(function (jqXHR, textStatus, errorThrown) {
              //console.log(errorThrown);
            })
            .complete(function (result, textStatus, jqXHR) {
              //console.log(result);
              //console.log(textStatus);
              //console.log(jqXHR);
              if (jqXHR === 'abort'){
                $.ajax({
                  type: 'delete',
                  url: setQueryParameter(uploadUrl, 'file', fileName),
                  success: function() {
                    //console.log('file deleted');
                  },
                  dataType: 'json'
                });
              }
            });
        var queueNumber;
        $.each(data.originalFiles, function(index, item){
          if( item.name === data.files[0].name ){
            queueNumber = index;
          }
        });
        /*$.each(data.files, function(index, file) {
          console.log('File send: '+file.name+', '+file.size+'Bytes, '+file.type+', last modified by user: '+file.lastModifiedDate);
        });*/
        $('ul.upload-items').append('<li><span class="file-name">'+data.files[0].name+'</span><br/><div class="progress-bar_'+queueNumber+' progress-bar-styles"></div><a href="javascript:void(0);" class="ui-icon ui-icon-closethick cancel-upload"></a></li>');
        $('ul.upload-items li:last').data('data',{jqXHR: xhr});
        $('a.cancel-upload').click(function(){
            $(this).parent('li').data('data').jqXHR.abort();
            //xhr.abort();
            $(this).parent('li').css('opacity','0.3');
        });
        if($('div#progress-box').find('a.close_file_upload').length == 0 ){
          $('div#progress-box').prepend('<a class="close_file_upload" href="javascript:void(0)"></a>');
        } 
        $('a.close_file_upload').click(function(){
            $('ul.upload-items').find('li').each(function(){
              $(this).data('data').jqXHR.abort();
            });
        });
        $('div.progress-bar_'+queueNumber+'').progressbar({
              value: 0
        });
    }, 
    done: function (e, data) {
      //console.log(data);
      var oFilesTable = $('table.drawFilesDataTable').dataTable();
      oFilesTable.fnDestroy();
      //console.log(data);
      if (data)
      {
        _.each(data.result, function(item, index) {
          //console.log(index);
          var size = data.files[index].size;
            if ((data.files[index].size/1024) < 1000 ) {
                size = (Math.floor(data.files[0].size/1024))+' KB';
            } else if ((data.files[index].size/1024/1024) < 1000 ) {
                size = (Math.floor(data.files[0].size/1024/1024))+' MB';
            } else if ((data.files[index].size/1024/1024) >= 1000 ) {
                size = (Math.floor(data.files[0].size/1024/1024))+' GB';
            } else {
                size = data.files[index].size+' B';
            }
          //console.log(window.serverTime);
          // This is the user's last modified time
          //var lastModified = data.files[0].lastModifiedDate;
          //console.log(item);
          var lastModified = window.serverTime;
          item.size = size;
          item.lastModified = lastModified;
          //console.log(item);
          appendEditableImage(item);
        });
      }
      //$('#progress-box').hide();
      drawFilesDataTable($('table.drawFilesDataTable'));
    },
    fail: function (e, data) {
      console.log(data);
      if ( data.textStatus == 'abort'){
        alert('Upload of '+data.files[0].name+' cancelled by user.');
      } else {
        alert('There was an error uploading '+data.files[0].name+'.  Please try again later or contact support.');
      }
    },
    start: function (e) {
      //$el.find('[data-spinner="1"]').show();
      $('body').prepend('<div id="progress-box" style="display:none;top:'+($(window).height()/2)+'"><p>Uploading ... <span id="progress-count"><span></p><ul class="upload-items"></ul></div>');
      $('#progress-box').slideDown(100);
      $('body').prepend('<div id="disable-overlay"></div>');
      //$('body').css('-webkit-filter', 'blur(2px)');
      $('#disable-overlay').fadeIn(200);
      //self.uploading = true;

    },
    stop: function (e) {
      //$el.find('[data-spinner="1"]').hide();
      $('#progress-box').slideUp(100);
      $('#progress-box').remove();
      $('ul.upload-items').html('');
      $('#disable-overlay').fadeOut(200);
      $('#disable-overlay').remove();
      //self.uploading = false;
    },
    send: function(e, data){


      /*$(document).find('a, ["onclick"]').click(function(){
        e.preventDefault();
        alert('Navigating away from this page during upload will cause file and data corruption.  Please wait for all uploads to finish or cancel them before visiting any other pages.');
      });*/
    },
    chunksend: function(e, data) {
      //console.log(data);
    },
    chunkdone: function(e, data) {
      //console.log(data);
    },
    chunkfail: function(e, data) {
      //console.log(data);
    },
    progress: function(e, data) {
      //console.log('Progress event for single file');
      //console.log(data);
      var queueNumber;
      $.each(data.originalFiles, function(index, item){
        if( item.name === data.files[0].name ){
          queueNumber = index;
        }
      });
      var progressValue = (data.loaded / data.files[0].size)*100;
      //console.log(progressValue);
      $('div.progress-bar_'+queueNumber+'').progressbar('value',progressValue);
      
    },
    progressall: function(e, data) {
      //console.log('Progress event for all files');
      //console.log(data);
      //$('#progress-box').show();
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
    //console.log(info);
    var item = $(fileTemplate(info));
    //console.log(info);
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


