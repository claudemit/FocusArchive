/* Animated WebP muxer for Canvas frames. Classic ES2017, no network or WASM. */
(function(root){"use strict";
function ascii(value){var out=new Uint8Array(value.length);for(var i=0;i<value.length;i++)out[i]=value.charCodeAt(i);return out}
function le24(value){return new Uint8Array([value&255,value>>>8&255,value>>>16&255])}
function le32(value){return new Uint8Array([value&255,value>>>8&255,value>>>16&255,value>>>24&255])}
function join(parts){var length=0,pos=0,i;for(i=0;i<parts.length;i++)length+=parts[i].length;var out=new Uint8Array(length);for(i=0;i<parts.length;i++){out.set(parts[i],pos);pos+=parts[i].length}return out}
function chunk(type,data){return join([ascii(type),le32(data.length),data,data.length%2?new Uint8Array(1):new Uint8Array(0)])}
function blobBuffer(blob){return new Promise(function(resolve,reject){var reader=new FileReader();reader.addEventListener("load",function(){resolve(new Uint8Array(reader.result))});reader.addEventListener("error",function(){reject(reader.error||new Error("读取 WebP 帧失败"))});reader.readAsArrayBuffer(blob)})}
function canvasWebP(canvas,quality){return new Promise(function(resolve,reject){canvas.toBlob(function(blob){if(!blob||blob.type!=="image/webp"){reject(new Error("当前浏览器不支持 Canvas WebP 编码"));return}resolve(blob)},"image/webp",quality)})}
function framePayload(bytes){
if(bytes.length<20||String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3])!=="RIFF"||String.fromCharCode(bytes[8],bytes[9],bytes[10],bytes[11])!=="WEBP")throw new Error("浏览器返回的 WebP 帧无效");
var parts=[],offset=12,hasImage=false;
while(offset+8<=bytes.length){var type=String.fromCharCode(bytes[offset],bytes[offset+1],bytes[offset+2],bytes[offset+3]),size=bytes[offset+4]|bytes[offset+5]<<8|bytes[offset+6]<<16|bytes[offset+7]<<24,total=8+size+(size%2);if(size<0||offset+total>bytes.length)throw new Error("WebP 帧数据不完整");if(type==="ALPH"||type==="VP8 "||type==="VP8L"){parts.push(bytes.slice(offset,offset+total));if(type==="VP8 "||type==="VP8L")hasImage=true}offset+=total}
if(!hasImage)throw new Error("WebP 帧缺少图像数据");return join(parts)
}
function animatedWebP(frames,width,height,duration){
var vp8x=chunk("VP8X",join([new Uint8Array([2,0,0,0]),le24(width-1),le24(height-1)]));
var anim=chunk("ANIM",new Uint8Array([255,255,255,255,0,0])),parts=[vp8x,anim],delay=Math.max(1,Math.round(duration/frames.length));
for(var i=0;i<frames.length;i++){var header=join([le24(0),le24(0),le24(width-1),le24(height-1),le24(delay),new Uint8Array([2])]);parts.push(chunk("ANMF",join([header,frames[i]])))}
var body=join(parts);return new Blob([ascii("RIFF"),le32(body.length+4),ascii("WEBP"),body],{type:"image/webp"})
}
root.encodeAnimatedWebP=async function(options){
var canvas=options.canvas,fps=options.fps||12,count=Math.max(2,Math.ceil(options.duration*fps/1000)),frames=[],bytes=0;
for(var i=0;i<count;i++){
if(options.cancelled())throw new Error("已取消动画导出");
options.draw(count===1?0:i*options.duration/(count-1));
var quality=options.quality===undefined?0.82:options.quality,payload=framePayload(await blobBuffer(await canvasWebP(canvas,quality)));bytes+=payload.length;if(bytes>180*1024*1024)throw new Error("动画过大，请缩短录制时间");frames.push(payload);
if(options.progress)options.progress((i+1)/count);await new Promise(function(resolve){setTimeout(resolve,0)})
}
return animatedWebP(frames,canvas.width,canvas.height,options.duration);
};
})(window);
