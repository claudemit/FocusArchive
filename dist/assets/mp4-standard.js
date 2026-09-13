/* Single-track CFR AVC muxer. Explicit sample tables, moov before mdat. */
(function(root){"use strict";
function u32(a){var out=new Uint8Array(a.length*4),v=new DataView(out.buffer);a.forEach(function(n,i){v.setUint32(i*4,n)});return out}
function u16(a){var out=new Uint8Array(a.length*2),v=new DataView(out.buffer);a.forEach(function(n,i){v.setUint16(i*2,n)});return out}
function ascii(s){return new Uint8Array(s.split("").map(function(c){return c.charCodeAt(0)}))}
function join(a){var n=a.reduce(function(n,b){return n+b.length},0),out=new Uint8Array(n),p=0;a.forEach(function(b){out.set(b,p);p+=b.length});return out}
function box(type,parts){var body=join(parts);return join([u32([body.length+8]),ascii(type),body])}
var matrix=u32([65536,0,0,0,65536,0,0,0,1073741824]);
function mux(samples,description,w,h){
if(!samples.length||!description||description[1]!==66||description[3]>31)throw Error("编码器未生成兼容的 H.264 Baseline 视频");
var count=samples.length,duration=count*3000,total=samples.reduce(function(n,s){return n+s.bytes.length},0);
if(total>1000000000)throw Error("视频过大，请缩短录制时间");
var ftyp=box("ftyp",[ascii("isom"),u32([512]),ascii("isomiso2avc1mp41")]);
function moov(offset){
var mvhd=box("mvhd",[u32([0,0,0,90000,duration,65536]),u16([256,0]),u32([0,0]),matrix,new Uint8Array(24),u32([2])]);
var tkhd=box("tkhd",[u32([7,0,0,1,0,duration,0,0]),u16([0,0,0,0]),matrix,u32([w*65536,h*65536])]);
var mdhd=box("mdhd",[u32([0,0,0,90000,duration]),u16([21956,0])]);
var hdlr=box("hdlr",[u32([0,0]),ascii("vide"),u32([0,0,0]),ascii("VideoHandler\0")]);
var avc1=box("avc1",[new Uint8Array(6),u16([1]),new Uint8Array(16),u16([w,h]),u32([4718592,4718592,0]),u16([1]),new Uint8Array(32),u16([24,65535]),box("avcC",[description]),box("pasp",[u32([1,1])])]);
var keys=[];samples.forEach(function(s,i){if(s.key)keys.push(i+1)});
var stbl=box("stbl",[box("stsd",[u32([0,1]),avc1]),box("stts",[u32([0,1,count,3000])]),box("stsc",[u32([0,1,1,count,1])]),box("stsz",[u32([0,0,count]),u32(samples.map(function(s){return s.bytes.length}))]),box("stco",[u32([0,1,offset])]),box("stss",[u32([0,keys.length]),u32(keys)])]);
var dinf=box("dinf",[box("dref",[u32([0,1]),box("url ",[u32([1])])])]);
var minf=box("minf",[box("vmhd",[u32([1]),u16([0,0,0,0])]),dinf,stbl]);
return box("moov",[mvhd,box("trak",[tkhd,box("mdia",[mdhd,hdlr,minf])])]);
}
var meta=moov(0);meta=moov(ftyp.length+meta.length+8);
return new Blob([ftyp,meta,u32([total+8]),ascii("mdat")].concat(samples.map(function(s){return s.bytes})),{type:"video/mp4"});
}
root.encodeStandardMp4=async function(options){
var canvas=options.canvas,count=Math.max(2,Math.ceil(options.duration*30/1000)+1),samples=[],description=null,failure=null,bytes=0;
var config={codec:"avc1.42001f",width:canvas.width,height:canvas.height,framerate:30,bitrate:6000000,hardwareAcceleration:"prefer-software",avc:{format:"avc"},latencyMode:"realtime"};
var support=await VideoEncoder.isConfigSupported(config);if(!support.supported)throw Error("当前浏览器不支持标准 H.264 软件编码，请使用最新版 Chrome 或 Edge");
var encoder=new VideoEncoder({output:function(chunk,metadata){var data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);bytes+=data.length;if(bytes>1000000000){failure=new Error("视频过大，请缩短录制时间");return}if(metadata.decoderConfig&&metadata.decoderConfig.description)description=new Uint8Array(metadata.decoderConfig.description).slice();samples.push({bytes:data,key:chunk.type==="key",timestamp:chunk.timestamp})},error:function(error){failure=error}});
function check(){if(options.cancelled())throw Error("已取消动画导出");if(failure)throw failure}
try{
encoder.configure(support.config);
for(var i=0;i<count;i++){
check();options.draw(Math.min(i*1000/30,options.duration));
var timestamp=Math.round(i*1000000/30),frame=new VideoFrame(canvas,{timestamp:timestamp,duration:Math.round((i+1)*1000000/30)-timestamp,alpha:"discard"});
try{encoder.encode(frame,{keyFrame:i%60===0})}finally{frame.close()}
if(i%8===7||i===count-1){await encoder.flush();check();options.progress((i+1)/count);await new Promise(function(resolve){setTimeout(resolve,0)})}
}
await encoder.flush();check();if(samples.length!==count)throw Error("视频帧数量不完整");
for(var j=0;j<count;j++)if(samples[j].timestamp!==Math.round(j*1000000/30))throw Error("编码器帧顺序异常");
return mux(samples,description,canvas.width,canvas.height);
}finally{if(encoder.state!=="closed")encoder.close()}
};
})(window);
