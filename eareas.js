/* 

earea 
 - ultralight twitter bootstrap HTML5 wysiwyg editor 
 - one unobstrusive toolbar for multiple Instances
 - Updates previous <input>
 - dragdrop images

h@coolbleiben.coop 10/2013 - 03/2014


*/

(function($){

   var hidding = null
   var current = null
   var base_url = window.location.href.split('/').slice(0,-1).join('/');

   // there is only one toolbar for all eareas, only one 'click' bind
   $('.eareatoolbar').on('click','a',function(e){
        e.preventDefault()
        current.focus(); 
        clearTimeout( hidding );
        $('.eareatoolbar').show();
        $(current).data('earea').doCommand( $(this).data('edit') );
    })
   $('.eareatoolbar').on('change','input[type=file]',function(e){
        e.preventDefault();
        clearTimeout( hidding );
        $('.eareatoolbar').show();
        if (this.type === 'file' && this.files && this.files.length > 0) $(current).data('earea').insertFiles(this.files);
			this.value = '';
    })

   // do not hide the toolbar while dropup
   .on('mouseover','ul',function(e){
        clearTimeout( hidding )
    })
    

   var Earea = function(element, options){
     this.el = element
     this.$el = $(this.el)
     this.origin = this.$el.prev().get(0);
     this.f = this.origin.form;
     this.mode = 'wysiwyg'
     this.selectedRange = null;
     this.isFullscreen = false;
     this.directory = this.el.dataset.directory;
     current = this.el;
     this.listen()
       
	}

	Earea.prototype = {
	    constructor: Earea
	    , listen: function(){ 
           this.$el.on('keyup' , $.proxy(this.keyup, this))
           this.$el.on('focus' , $.proxy(this.focus , this))
           this.$el.on('blur'  , $.proxy(this.blur  , this))
           this.$el.on('drop'  , $.proxy(this.drop  , this))
           this.$el.on('dragenter dragover', false)
           this.$el.on('mouseup keyup mouseout', $.proxy(this.saveSelectedRange , this))
       }

       ,saveSelectedRange: function(){
           var sel = window.getSelection();
           if (sel.getRangeAt && sel.rangeCount) {
               this.selectedRange = sel.getRangeAt(0);
           }
       }

       ,restoreSelectedRange: function(){
           if (! this.selectedRange ) return false;
           window.getSelection().removeAllRanges();
           window.getSelection().addRange( this.selectedRange );
       }

       // update the real input element, normally hidden.
	    ,updateOrigin: function(){
         if( this.mode == 'wysiwyg' )
             this.origin.value = this.el.innerHTML.replace(/^\s+/,'');
         else
             this.origin.value = this.el.textContent.replace(/^\s+/,'');
       } // change

	    ,keyup: function(e){
         if(e.keyCode == 27 ){ // escape key, exists fullscreen and html editor
             if( this.isFullscreen ) this.doCommand('fullscreen');
             if( this.mode == 'html' ) this.doCommand('html');  
             }
         this.updateOrigin();
       } // change

	    ,focus: function(){ 
          current = this.el;
          clearTimeout( hidding )
          $('.eareatoolbar').fadeIn();
       } // focus

	    ,blur: function(){ 
           // escondemos con una pausa por si estoy haciendo click en la toolbar
           clearTimeout( hidding );
           if( this.mode == 'html' )
               this.doCommand('toWysiwyg');
           else{
              hidding = setTimeout(function(){ 
                   $('.eareatoolbar').fadeOut();
               }, 200 );
           }
           this.updateOrigin();
       } // blur

       ,drop: function (e) {
           var dataTransfer = e.originalEvent.dataTransfer;
           e.stopPropagation();
           e.preventDefault();
           if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
               this.insertFiles(dataTransfer.files);
               }
           } // drop

       ,insertFiles: function (files) {
           var that = this;
           this.el.focus();
           $.each(files, function (idx, fileInfo) {
               if (/^image\//.test(fileInfo.type)) {
                   $.when(that.readFileIntoDataUrl(fileInfo))
                       .done(function (dataUrl) {
                           that.doCommand('insertimage ' + dataUrl)
                   })
                       .fail(function(e){
                           alert('Error al subir fichero');
                       })
               }
               else 
               {
                   alert("Error unsupported-file-type")
               }
           });
       } // insertFiles
       
       ,doCommand: function(command){

           this.restoreSelectedRange();

           if( ! command || command == '' ) return false;

           if( command == 'createLink' ) command += ' ' + prompt("Link:");

           if( command == 'fullscreen') {
                  var $scrollbar = $('html, body');
                  var $editor = this.$el;

                  var resize = function (size) { $editor.css('width' , size.w).css('height', size.h); };

                  this.$el.toggleClass('eareas-fullscreen');
                  this.isFullscreen = this.$el.hasClass('eareas-fullscreen');
                  if (this.isFullscreen) {
                    this.currentHeight = this.$el.css('height');

                    $(window).on('resize', function () {
                      resize({ w: $(window).width(), h: $(window).height() - $('.eareatoolbar').outerHeight() });
                    }).trigger('resize');

                    $scrollbar.css('overflow', 'hidden');
                  } else {
                    $(window).off('resize');
                    resize({ w: '', h: this.currentHeight });
                    $scrollbar.css('overflow', 'auto');
                  }
               }
           
           else if( command == 'toWysiwyg' ){
               this.el.innerHTML=this.el.textContent;
               this.mode = 'wysiwyg';
               }
           
           else if( command == 'html' ){
               if( this.mode == 'wysiwyg' ){
                   this.el.textContent=this.el.innerHTML;
                   this.mode = 'html';
                   $('.eareatoolbar').hide();
                   }
               else{
                  this.doCommand('toWysiwyg');
                   $('.eareatoolbar').show();
               }
           }
           else{
               document.execCommand("styleWithCSS");
               command = command.split(' ');
               document.execCommand( command[0], 0, command.length > 1 ? command.slice(1).join(' ') : '' );
           }
           this.updateOrigin();
           return false;
       } // doCommand


       
      ,	readFileIntoDataUrl : function (fileInfo) {
            var loader = $.Deferred();
            var fReader = new FileReader();
            var that = this;
            fReader.onload = function (e) {
                NProgress.start();
                
               var result1 = e.target.result;
               var fileName = fileInfo.name;
                
               $.ajax({
                  xhr: function() {
                     var xhr = new window.XMLHttpRequest();
                     //Upload progress
                     xhr.upload.addEventListener("progress", function(evt){
                        if (evt.lengthComputable) {
                           var percentComplete = (evt.loaded / evt.total);
                           NProgress.set(percentComplete);
                        }
                     }, false);
                     return xhr;
                  },
                  type: 'POST',
                  url: base_url+'/eareasUpload.cfm',
                  data: { data: result1, name: fileName, directory: that.directory },
                  error: function(){ NProgress.done(); loader.reject() },
                  success: function(data){
                     NProgress.done();
                     loader.resolve( base_url + "/" + that.directory + "/" + data);
                  }
               });
            };
            fReader.onerror    = loader.reject;
            fReader.onprogress = loader.notify;
            fReader.readAsDataURL(fileInfo);

            //return "https://graph.facebook.com/100000144008693/picture";
            return loader.promise();
         }



       

   } // prototype

    $.fn.earea = function(option){
	      return this.each(function(){
				 var $this = $(this)
				 , data = $this.data('earea')
				 if (!data) $this.data('earea', (data = new Earea(this)))
			  })
	          }
    
    $.fn.earea.Constructor = Earea
    
    $(document).on('focus'    ,'.earea', function (e) {
        var $this = $(this)
        $this.earea( $this.data() )
    })
    
    
}($))
