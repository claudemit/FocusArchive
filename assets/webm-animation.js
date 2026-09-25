/* Desktop-only MediaRecorder fallback when H.264 WebCodecs is unavailable. */
(function(root){"use strict";
function mimeType(){var types=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"],i;for(i=0;i<types.length;i++)if(MediaRecorder.isTypeSupported(types[i]))return types[i];return""}
root.canEncodeAnimatedWebM=function(){return!!(HTMLCanvasElement.prototype.captureStream&&root.MediaRecorder&&mimeType())};
root.encodeAnimatedWebM=function(options){return new Promise(function(resolve,reject){
var canvas=options.canvas,fps=options.fps||30,type=mimeType(),stream,recorder,frames=Math.max(2,Math.ceil(options.duration*fps/1000)+1),index=0,parts=[],failure=null,finished=false;
if(!root.canEncodeAnimatedWebM()){reject(new Error("当前浏览器不支持 WebM 动画编码"));return}
stream=canvas.captureStream(fps);recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:8000000});
function stop(error){if(finished)return;finished=true;failure=error||null;recorder.stop()}
recorder.addEventListener("dataavailable",function(event){if(event.data&&event.data.size)parts.push(event.data)});
recorder.addEventListener("error",function(event){failure=event.error||new Error("WebM 动画编码失败")});
recorder.addEventListener("stop",function(){if(failure)reject(failure);else resolve(new Blob(parts,{type:type}))});
function draw(){if(options.cancelled()){stop(new Error("已取消动画导出"));return}options.draw(Math.min(index*1000/fps,options.duration));index++;if(options.progress)options.progress(index/frames);if(index>=frames){setTimeout(function(){stop(null)},Math.ceil(1000/fps));return}setTimeout(draw,Math.ceil(1000/fps))}
recorder.start();draw();
})};
})(window);
