window.addEventListener('error', function(event) {
  document.body.innerHTML += '<div style="color:red;z-index:9999;position:absolute;top:0;left:0;background:white;padding:20px;">' + event.message + '<br/>' + event.filename + ':' + event.lineno + '</div>';
});
window.addEventListener('unhandledrejection', function(event) {
  document.body.innerHTML += '<div style="color:red;z-index:9999;position:absolute;top:0;left:0;background:white;padding:20px;">' + event.reason + '</div>';
});
