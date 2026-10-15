// Rebuild lens centers for the 55-frame portrait sequence. Coordinates are in its 600px source texture.
// Cluster dark lens pixels below the bridge; excludes hair and brows above the sampling band.
import sharp from 'sharp';
import fs from 'node:fs';
(async () => {
 const tracks = [];
 for (let sheet = 1; sheet <= 2; sheet++) {
  const {data,info} = await sharp(`public/assets/images/portrait-video-20261011-232951/sheet-0${sheet}.webp`).raw().toBuffer({resolveWithObject:true});
  for(let tile=0; tile<32 && tracks.length<55; tile++) {
   const pixels=[];
   for(let y=325;y<375;y++) for(let x=150;x<490;x++) {
    const i=(((Math.floor(tile/8)*600+y)*info.width)+(tile%8)*600+x)*info.channels;
    if(Math.max(data[i],data[i+1],data[i+2])<55) pixels.push([x,y]);
   }
   let centers=[[235,345],[380,345]];
   for(let j=0;j<15;j++) {
    const groups=[[],[]];
    for(const p of pixels) groups[Math.abs(p[0]-centers[0][0])<Math.abs(p[0]-centers[1][0])?0:1].push(p);
    centers=groups.map(g=>[g.reduce((n,p)=>n+p[0],0)/g.length,g.reduce((n,p)=>n+p[1],0)/g.length]);
   }
   tracks.push(centers.map(p=>p.map(n=>Math.round(n*10)/10)));
  }
 }
 fs.writeFileSync('src/data/portrait-lens-tracking.json','[\n' + tracks.map(frame => '  ' + JSON.stringify(frame)).join(',\n') + '\n]\n');
 console.log({first:tracks[0],turn:tracks[2],smile:tracks[54]});
})();
