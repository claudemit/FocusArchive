/* Finalize the single AVC track produced by Canvas MediaRecorder as a seekable MP4.
 * No decoding or re-encoding: retain samples and rebuild complete sample tables. */
(function(root){"use strict";
function finalize(buffer){
var data=new Uint8Array(buffer),view=new DataView(data.buffer,data.byteOffset,data.byteLength);
function u(p){return view.getUint32(p)}
function type(p){return String.fromCharCode.apply(null,data.subarray(p,p+4))}
function boxes(start,end){var out=[];while(start<end){if(start+8>end)throw Error("MP4 box header incomplete");var size=u(start),head=8;if(size===1){size=u(start+8)*4294967296+u(start+12);head=16}if(size===0)size=end-start;if(size<head||start+size>end)throw Error("MP4 box size invalid");out.push({type:type(start+4),start:start,end:start+size,p:start+head});start+=size}return out}
function children(b){return boxes(b.p,b.end)}
function get(list,t){var b=list.filter(function(x){return x.type===t})[0];if(!b)throw Error("MP4 missing "+t);return b}
function raw(b){return data.slice(b.start,b.end)}
function words(a){var b=new Uint8Array(a.length*4),v=new DataView(b.buffer);a.forEach(function(n,i){v.setUint32(i*4,n)});return b}
function join(parts){var size=parts.reduce(function(n,p){return n+p.length},0),out=new Uint8Array(size),p=0;parts.forEach(function(a){out.set(a,p);p+=a.length});return out}
function box(t,parts){var body=join(parts);return join([words([body.length+8]),new Uint8Array(t.split("").map(function(c){return c.charCodeAt(0)})),body])}
function table(t,entries,version){return box(t,[words([(version||0)*16777216,entries.length]),words([].concat.apply([],entries))])}
var top=boxes(0,data.length),moov=get(top,"moov"),moovChildren=children(moov),tracks=moovChildren.filter(function(b){return b.type==="trak"});
if(!top.some(function(b){return b.type==="moof"}))return buffer;
if(tracks.length!==1)throw Error("MP4 finalizer requires one video track");
var trak=tracks[0],tc=children(trak),mdia=get(tc,"mdia"),mc=children(mdia),minf=get(mc,"minf"),ic=children(minf),stbl=get(ic,"stbl"),stsd=get(children(stbl),"stsd"),mdhd=get(mc,"mdhd"),mvhd=get(moovChildren,"mvhd"),tkhd=get(tc,"tkhd"),trex=get(children(get(moovChildren,"mvex")),"trex");
if(type(get(mc,"hdlr").p+8)!=="vide"||type(stsd.p+12)!=="avc1")throw Error("Unsupported MP4 video track");
var trackId=u(trex.p+4),defaultDuration=u(trex.p+12),defaultSize=u(trex.p+16),defaultFlags=u(trex.p+20),samples=[],payload=[],totalBytes=0;
top.filter(function(b){return b.type==="moof"}).forEach(function(moof){
children(moof).filter(function(b){return b.type==="traf"}).forEach(function(traf){
var c=children(traf),tfhd=get(c,"tfhd"),flags=u(tfhd.p)&16777215,p=tfhd.p+8,base=moof.start,dur=defaultDuration,size=defaultSize,sflags=defaultFlags;
if(u(tfhd.p+4)!==trackId)throw Error("MP4 track mismatch");
if(flags&1){base=u(p)*4294967296+u(p+4);p+=8}if(flags&2){if(u(p)!==1)throw Error("Multiple sample descriptions unsupported");p+=4}if(flags&8){dur=u(p);p+=4}if(flags&16){size=u(p);p+=4}if(flags&32)sflags=u(p);
var tfdt=get(c,"tfdt"),decodeTime=data[tfdt.p]===1?u(tfdt.p+4)*4294967296+u(tfdt.p+8):u(tfdt.p+4),nextOffset=null;
c.filter(function(b){return b.type==="trun"}).forEach(function(run){var f=u(run.p)&16777215,count=u(run.p+4),q=run.p+8,offset=nextOffset,firstFlags=sflags;if(f&1){offset=base+view.getInt32(q);q+=4}if(f&4){firstFlags=u(q);q+=4}if(offset===null)throw Error("MP4 sample offset missing");
for(var i=0;i<count;i++){var d=dur,z=size,sf=i===0?firstFlags:sflags,cto=0;if(f&256){d=u(q);q+=4}if(f&512){z=u(q);q+=4}if(f&1024){sf=u(q);q+=4}if(f&2048){cto=data[run.p]===1?view.getInt32(q):u(q);q+=4}if(q>run.end||!d||!z||!top.some(function(b){return b.type==="mdat"&&offset>=b.p&&offset+z<=b.end}))throw Error("Invalid MP4 sample");samples.push({dts:decodeTime,duration:d,size:z,sync:!(sf&65536),cto:cto});decodeTime+=d;payload.push(data.subarray(offset,offset+z));offset+=z;totalBytes+=z}nextOffset=offset;
});});});
if(!samples.length)throw Error("MP4 contains no frames");
for(var si=0;si<samples.length-1;si++){var delta=samples[si+1].dts-samples[si].dts;if(delta<=0)throw Error("MP4 timestamps are not increasing");samples[si].duration=delta}
var mediaScale=u(mdhd.p+(data[mdhd.p]===1?20:12)),movieScale=u(mvhd.p+(data[mvhd.p]===1?20:12)),duration=samples.reduce(function(n,s){return n+s.duration},0),movieDuration=Math.ceil(duration*movieScale/mediaScale);
function durationBox(b,n,track){var bytes=raw(b),v=new DataView(bytes.buffer),p=b.p-b.start,version=bytes[p],offset=track?(version===1?28:20):(version===1?24:16);if(version===1){v.setUint32(p+offset,Math.floor(n/4294967296));v.setUint32(p+offset+4,n>>>0)}else{if(n>4294967295)throw Error("Video duration too long");v.setUint32(p+offset,n)}return bytes}
function runs(key){var a=[];samples.forEach(function(s){var last=a[a.length-1];if(last&&last[1]===s[key])last[0]++;else a.push([1,s[key]])});return a}
function makeMoov(offset){var tables=[raw(stsd),table("stts",runs("duration")),table("stsc",[[1,samples.length,1]]),box("stsz",[words([0,0,samples.length]),words(samples.map(function(s){return s.size}))]),table("stco",[[offset]]),table("stss",samples.map(function(s,i){return s.sync?[i+1]:null}).filter(Boolean))];if(samples.some(function(s){return s.cto!==0}))tables.push(table("ctts",runs("cto"),samples.some(function(s){return s.cto<0})?1:0));
var newMinf=box("minf",ic.map(function(b){return b.type==="stbl"?box("stbl",tables):raw(b)}));
var newMdia=box("mdia",mc.map(function(b){return b.type==="mdhd"?durationBox(b,duration,false):b.type==="minf"?newMinf:raw(b)}));
var newTrak=box("trak",tc.filter(function(b){return b.type!=="edts"}).map(function(b){return b.type==="tkhd"?durationBox(b,movieDuration,true):b.type==="mdia"?newMdia:raw(b)}));
return box("moov",moovChildren.filter(function(b){return b.type!=="mvex"}).map(function(b){return b.type==="mvhd"?durationBox(b,movieDuration,false):b.type==="trak"?newTrak:raw(b)}));}
var ftyp=box("ftyp",[new Uint8Array([105,115,111,109]),words([512]),new Uint8Array([105,115,111,109,105,115,111,50,97,118,99,49,109,112,52,49])]),meta=makeMoov(0);meta=makeMoov(ftyp.length+meta.length+8);
if(totalBytes+meta.length+ftyp.length+8>=4294967296)throw Error("MP4 file too large");
return join([ftyp,meta,words([totalBytes+8]),new Uint8Array([109,100,97,116])].concat(payload)).buffer;
}
root.finalizeCanvasMp4=finalize;
})(typeof window!=="undefined"?window:global);
