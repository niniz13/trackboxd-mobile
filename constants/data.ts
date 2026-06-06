export interface AlbumPalette {
  bg: string; ink: string; c1: string; c2: string; c3: string;
  style: 'rings'|'split'|'wave'|'grid'|'orb'|'bars'|'cross'|'type';
}

export interface Album {
  id: string; title: string; artist: string; year: number;
  type: string; genre: string; len: number; rt: number; votes: string;
  pal: AlbumPalette; tracks: string[];
}

export interface User {
  id: string; name: string; handle: string; color: string; initial: string;
}

export interface FeedEntry {
  id: string; user: string; album: string; rt: number; liked: boolean;
  when: string; review?: string; likes: number; comments: number;
}

export interface DiaryEntry {
  album: string; date: string; rt: number; liked: boolean;
}

export interface ActivityEntry {
  id: string; type: 'like'|'follow'|'comment'|'review';
  user: string; album?: string; text?: string; when: string;
}

const albums: Album[] = [
  { id:'a1', title:'NEON DUSK', artist:'Velour Static', year:2025, type:'Album', genre:'Synth-pop', len:11, rt:4.3, votes:'24k',
    pal:{bg:'#2c0a3e',ink:'#ffd9f2',c1:'#ff2d95',c2:'#7b2dff',c3:'#ffd23f',style:'rings'},
    tracks:['Glass Avenue','Dusk Protocol','Velvet Noise','Aphelion','Static Bloom','Midnight Index','Neon Dusk','Afterglow'] },
  { id:'a2', title:'BLOOD ORANGE', artist:'Kosmo Vane', year:2024, type:'Album', genre:'Art rock', len:9, rt:4.6, votes:'41k',
    pal:{bg:'#2e0f06',ink:'#ffd9c2',c1:'#ff5e1a',c2:'#ff2d55',c3:'#ffd23f',style:'split'},
    tracks:['Citrus','Hollow Sun','Pulp','Bitter Rind','Blood Orange','Zest','Peel'] },
  { id:'a3', title:'TIDAL', artist:'Marin Ø', year:2025, type:'Album', genre:'Ambient', len:7, rt:3.9, votes:'8.2k',
    pal:{bg:'#04211f',ink:'#c8fff5',c1:'#00e0c6',c2:'#0aa3ff',c3:'#c6ff4d',style:'wave'},
    tracks:['Low Tide','Brine','Undertow','Tidal','Saltwater','Drift','High Tide'] },
  { id:'a4', title:'CONCRETE GARDEN', artist:'Mara Plisken', year:2023, type:'Album', genre:'Hyperpop', len:12, rt:4.1, votes:'17k',
    pal:{bg:'#0d1a04',ink:'#e8ffcf',c1:'#b6ff2e',c2:'#00e676',c3:'#ffffff',style:'grid'},
    tracks:['Rebar','Weed Through','Concrete Garden','Bloom Anyway','Sidewalk','Trellis','Grow'] },
  { id:'a5', title:'COBALT HOURS', artist:'The Pale Engine', year:2025, type:'Album', genre:'Shoegaze', len:10, rt:4.8, votes:'52k',
    pal:{bg:'#060a2e',ink:'#cfe0ff',c1:'#2d6bff',c2:'#ff5ea8',c3:'#ffe14d',style:'orb'},
    tracks:['First Cobalt','Haze','Reverb Saint','Cobalt Hours','Wash','Bleed Blue','Last Cobalt'] },
  { id:'a6', title:'CRIMSON TAPE', artist:'Lux Tremaine', year:2024, type:'EP', genre:'Soul', len:5, rt:4.4, votes:'12k',
    pal:{bg:'#2c0410',ink:'#ffd6dd',c1:'#ff1f4b',c2:'#ff8a3d',c3:'#ffe6a3',style:'bars'},
    tracks:['Velvet','Crimson Tape','Slow Burn','Honey','Encore'] },
  { id:'a7', title:'FUTURE PERFECT', artist:'Anodyne', year:2025, type:'Album', genre:'IDM', len:13, rt:4.0, votes:'9.7k',
    pal:{bg:'#16042c',ink:'#ecd9ff',c1:'#9b5cff',c2:'#c6ff4d',c3:'#ff5ea8',style:'cross'},
    tracks:['Tense','Conditional','Future Perfect','Subjunctive','Past Continuous','Imperative'] },
  { id:'a8', title:'AMBER ROOM', artist:'Søren Halle', year:2022, type:'Album', genre:'Jazz', len:8, rt:4.7, votes:'21k',
    pal:{bg:'#2c1c00',ink:'#ffeec2',c1:'#ffb02e',c2:'#ff5e1a',c3:'#fff2cc',style:'type'},
    tracks:['Resin','Amber Room','Fossil Light','Slow Gold','Lacquer','Warm Static'] },
  { id:'a9', title:'WIRE FRAME', artist:'NULLSET', year:2025, type:'Single', genre:'Techno', len:1, rt:4.2, votes:'6.1k',
    pal:{bg:'#05140a',ink:'#c9ffe0',c1:'#00ff85',c2:'#1affff',c3:'#f0ff00',style:'grid'},
    tracks:['Wire Frame'] },
  { id:'a10', title:'PAPER MOON', artist:'Junie Wren', year:2024, type:'Album', genre:'Folk', len:10, rt:4.5, votes:'15k',
    pal:{bg:'#241405',ink:'#ffe9c7',c1:'#e8a13c',c2:'#d6643b',c3:'#fff0d4',style:'orb'},
    tracks:['Kindling','Paper Moon','Whittle','Creekbed','Lanternlight','Homespun'] },
  { id:'a11', title:'VIOLET HOUR', artist:'Sable', year:2025, type:'Album', genre:'R&B', len:11, rt:4.6, votes:'33k',
    pal:{bg:'#1b0630',ink:'#eccfff',c1:'#b14bff',c2:'#ff4bb1',c3:'#4bd4ff',style:'rings'},
    tracks:['Dusk Skin','Violet Hour','Slow Motion','Afterhours','Velour','Comedown'] },
  { id:'a12', title:'STATIC BLOOM', artist:'Hex Garden', year:2023, type:'Album', genre:'Noise pop', len:9, rt:3.7, votes:'4.4k',
    pal:{bg:'#06262c',ink:'#c7fbff',c1:'#19e3ff',c2:'#ff3d7f',c3:'#e9ff3d',style:'wave'},
    tracks:['Feedback Petals','Static Bloom','Thorn','Distort','Pollen','Decay'] },
];

export const albumMap: Record<string, Album> = Object.fromEntries(albums.map(a => [a.id, a]));
export const allAlbums = albums;

export const users: Record<string, User> = {
  you:   { id:'you',   name:'Alex Mercer',  handle:'you',          color:'#ff2d95', initial:'A' },
  iris:  { id:'iris',  name:'Iris Cho',     handle:'iristhinks',   color:'#00e0c6', initial:'I' },
  dom:   { id:'dom',   name:'Dominic R.',   handle:'domtape',      color:'#ffb02e', initial:'D' },
  nadia: { id:'nadia', name:'Nadia O.',     handle:'lowtide',      color:'#7b2dff', initial:'N' },
  theo:  { id:'theo',  name:'Theo Vance',   handle:'reverbsaint',  color:'#2d6bff', initial:'T' },
  juno:  { id:'juno',  name:'Juno B.',      handle:'junonotjune',  color:'#b6ff2e', initial:'J' },
};

export const feed: FeedEntry[] = [
  { id:'f1', user:'iris', album:'a5', rt:5, liked:true, when:'2h',
    review:"Album of the year, no notes. The way 'Reverb Saint' collapses into the title track is the single best transition I've heard since I started keeping this diary.",
    likes:184, comments:27 },
  { id:'f2', user:'dom', album:'a2', rt:4.5, liked:true, when:'5h',
    review:"Kosmo finally trusts the silence. Sparser than the debut and so much heavier for it.",
    likes:92, comments:11 },
  { id:'f3', user:'nadia', album:'a3', rt:3.5, liked:false, when:'8h',
    review:undefined, likes:41, comments:4 },
  { id:'f4', user:'theo', album:'a11', rt:4, liked:false, when:'12h',
    review:"Sable's most textured work. 'Violet Hour' is one of her finest closers.",
    likes:67, comments:9 },
  { id:'f5', user:'juno', album:'a8', rt:5, liked:true, when:'1d',
    review:"I return to 'Amber Room' every autumn. Nothing else sounds like it.",
    likes:203, comments:31 },
  { id:'f6', user:'iris', album:'a7', rt:3.5, liked:false, when:'2d',
    review:undefined, likes:23, comments:3 },
];

export const favorites = ['a5','a2','a11','a8'];

export const diary: DiaryEntry[] = [
  { album:'a5', date:'Jun 3', rt:5, liked:true },
  { album:'a1', date:'Jun 1', rt:4, liked:false },
  { album:'a11', date:'May 29', rt:4, liked:true },
  { album:'a8', date:'May 27', rt:5, liked:true },
  { album:'a3', date:'May 24', rt:3.5, liked:false },
  { album:'a2', date:'May 20', rt:4.5, liked:true },
  { album:'a7', date:'May 18', rt:3.5, liked:false },
  { album:'a10', date:'May 15', rt:4, liked:false },
];

export const activity: ActivityEntry[] = [
  { id:'ac1', type:'like',    user:'iris',  album:'a5',  when:'2h' },
  { id:'ac2', type:'comment', user:'dom',   album:'a5',  text:'That transition at 3:20 is everything.',      when:'3h' },
  { id:'ac3', type:'follow',  user:'theo',              when:'5h' },
  { id:'ac4', type:'like',    user:'nadia', album:'a2',  when:'8h' },
  { id:'ac5', type:'review',  user:'juno',  album:'a8',  text:'Left a review on AMBER ROOM.',                when:'1d' },
  { id:'ac6', type:'comment', user:'iris',  album:'a11', text:'Violet Hour is her best album. Period.',     when:'1d' },
  { id:'ac7', type:'follow',  user:'dom',               when:'2d' },
];

export const trending = ['a5','a11','a1','a6','a2','a8'];
export const newReleases = ['a9','a7','a4','a12','a3','a10'];
