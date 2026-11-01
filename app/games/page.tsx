"use client";

import "./games.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { Trophy, Users, QrCode, Play, Pause, RotateCcw, Volume2, VolumeX, Gamepad2, Copy, ArrowRight, Crown, Wifi, WifiOff } from "lucide-react";

type Piece = { shape: number[][]; color: string };
type ScoreRow = { id: string; player_name: string; best_score: number; created_at?: string };
const COLS = 10, ROWS = 20;
const PIECES: Piece[] = [
  { shape:[[1,1,1,1]], color:"#34e7ff" },
  { shape:[[1,1],[1,1]], color:"#ffe66d" },
  { shape:[[0,1,0],[1,1,1]], color:"#b58cff" },
  { shape:[[1,0,0],[1,1,1]], color:"#ff9f43" },
  { shape:[[0,0,1],[1,1,1]], color:"#4d96ff" },
  { shape:[[0,1,1],[1,1,0]], color:"#6bffb5" },
  { shape:[[1,1,0],[0,1,1]], color:"#ff6b8a" }
];
const emptyBoard = () => Array.from({length:ROWS}, () => Array(COLS).fill(""));
const randomPiece = () => PIECES[Math.floor(Math.random()*PIECES.length)];
function rotate(shape:number[][]) { return shape[0].map((_,i)=>shape.map(row=>row[i]).reverse()); }

export default function Home() {
  const [board,setBoard] = useState<string[][]>(emptyBoard);
  const [piece,setPiece] = useState<Piece>(randomPiece);
  const [next,setNext] = useState<Piece>(randomPiece);
  const [pos,setPos] = useState({x:3,y:0});
  const [score,setScore] = useState(0);
  const [lines,setLines] = useState(0);
  const [level,setLevel] = useState(1);
  const [timedMode,setTimedMode] = useState(false);
  const [durationMinutes,setDurationMinutes] = useState(5);
  const [timeLeft,setTimeLeft] = useState(300);
  const [finalRanked,setFinalRanked] = useState(false);
  const [running,setRunning] = useState(false);
  const [gameOver,setGameOver] = useState(false);
  const [player,setPlayer] = useState("");
  const [nameInput,setNameInput] = useState("");
  const [mode,setMode] = useState<"solo"|"room"|"leaderboard">("solo");
  const [roomCode,setRoomCode] = useState("");
  const [roomInput,setRoomInput] = useState("");
  const [roomUrl,setRoomUrl] = useState("");
  const [scores,setScores] = useState<ScoreRow[]>([]);
  const [notice,setNotice] = useState("");
  const [muted,setMuted] = useState(true);
  const [roomPlayers,setRoomPlayers] = useState<string[]>([]);
  const [connected,setConnected] = useState(false);
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const posRef = useRef(pos);
  const runningRef = useRef(running);
  useEffect(()=>{boardRef.current=board},[board]);
  useEffect(()=>{pieceRef.current=piece},[piece]);
  useEffect(()=>{posRef.current=pos},[pos]);
  useEffect(()=>{runningRef.current=running},[running]);

  useEffect(()=>{
    const stored = typeof window !== "undefined" ? localStorage.getItem("tetris-pro-name") : null;
    if(stored) { setPlayer(stored); setNameInput(stored); }
    const best = Number(typeof window !== "undefined" ? localStorage.getItem("tetris-pro-best") : 0);
    setScores(best ? [{id:"local",player_name:stored || "Bạn",best_score:best}] : []);
    if(supabase) setConnected(true);
  },[]);

  const collision = useCallback((shape:number[][], x:number, y:number, b:string[][]) => {
    for(let sy=0;sy<shape.length;sy++) for(let sx=0;sx<shape[sy].length;sx++) {
      if(!shape[sy][sx]) continue;
      const nx=x+sx, ny=y+sy;
      if(nx<0 || nx>=COLS || ny>=ROWS || (ny>=0 && b[ny][nx])) return true;
    }
    return false;
  },[]);

  const lockPiece = useCallback((curBoard:string[][], curPiece:Piece, curPos:{x:number;y:number}) => {
    const b=curBoard.map(r=>[...r]);
    curPiece.shape.forEach((row,sy)=>row.forEach((v,sx)=>{if(v && curPos.y+sy>=0) b[curPos.y+sy][curPos.x+sx]=curPiece.color;}));
    const remaining=b.filter(row=>row.some(cell=>!cell));
    const cleared=ROWS-remaining.length;
    while(remaining.length<ROWS) remaining.unshift(Array(COLS).fill(""));
    const pts=[0,100,300,500,800][cleared] || cleared*200;
    setBoard(remaining); boardRef.current=remaining;
    if(cleared){setLines(n=>n+cleared);setScore(n=>n+pts*level);setLevel(n=>Math.floor((n+cleared)/10)+1);}
    const spawned=next;
    const nextPiece=randomPiece();
    setPiece(spawned); pieceRef.current=spawned; setNext(nextPiece);
    const start={x:3,y:0}; setPos(start); posRef.current=start;
    if(collision(spawned.shape,start.x,start.y,remaining)){setRunning(false);setGameOver(true);}
  },[collision,level,next]);

  const saveResult = useCallback(async (finalScore:number) => {
    const who=player || "Người chơi";
    const old=Number(localStorage.getItem("tetris-pro-best")||0);
    if(finalScore>old) localStorage.setItem("tetris-pro-best",String(finalScore));
    if(supabase) {
      await supabase.from("tetris_scores").upsert({player_name:who,best_score:Math.max(old,finalScore)}, {onConflict:"player_name"});
      const {data}=await supabase.from("tetris_scores").select("id,player_name,best_score,created_at").order("best_score",{ascending:false}).limit(20);
      if(data) setScores(data as ScoreRow[]);
    } else {
      setScores([{id:"local",player_name:who,best_score:Math.max(old,finalScore)}]);
    }
  },[player]);

  const startGame = () => {
    if(!player.trim()){setNotice("Hãy nhập tên người chơi trước khi bắt đầu.");return;}
    setBoard(emptyBoard()); boardRef.current=emptyBoard();
    const p=randomPiece(), n=randomPiece();
    setPiece(p);pieceRef.current=p;setNext(n);setPos({x:3,y:0});posRef.current={x:3,y:0};
    setScore(0);setLines(0);setLevel(1);setGameOver(false);setFinalRanked(false);setTimeLeft(durationMinutes*60);setRunning(true);setNotice("");
  };

  const move = useCallback((dx:number,dy:number) => {
    if(!runningRef.current) return;
    const p=pieceRef.current, at=posRef.current, b=boardRef.current;
    if(!collision(p.shape,at.x+dx,at.y+dy,b)) {
      const nextPos={x:at.x+dx,y:at.y+dy};setPos(nextPos);posRef.current=nextPos;
      if(dy>0) setScore(s=>s+1);
    } else if(dy>0) lockPiece(b,p,at);
  },[collision,lockPiece]);

  const rotatePiece = useCallback(() => {
    if(!runningRef.current)return;
    const p=pieceRef.current, at=posRef.current, rotated={...p,shape:rotate(p.shape)};
    if(!collision(rotated.shape,at.x,at.y,boardRef.current)){setPiece(rotated);pieceRef.current=rotated;}
  },[collision]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," "].includes(e.key)) e.preventDefault();
      if(e.key==="ArrowLeft"||e.key==="a")move(-1,0);
      if(e.key==="ArrowRight"||e.key==="d")move(1,0);
      if(e.key==="ArrowDown"||e.key==="s")move(0,1);
      if(e.key==="ArrowUp"||e.key==="w")rotatePiece();
      if(e.key===" " && runningRef.current){let count=0;while(count++<ROWS && !collision(pieceRef.current.shape,posRef.current.x,posRef.current.y+1,boardRef.current))move(0,1);move(0,1);}
      if(e.key==="Escape")setRunning(v=>!v);
    };
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[move,rotatePiece,collision]);

  useEffect(()=>{
    if(!running)return;
    const timer=window.setInterval(()=>move(0,1),Math.max(100,850-(level-1)*65));
    return()=>window.clearInterval(timer);
  },[running,level,move]);

  const visibleBoard=useMemo(()=>{
    const b=board.map(r=>[...r]);
    piece.shape.forEach((row,sy)=>row.forEach((v,sx)=>{
      const x=pos.x+sx,y=pos.y+sy;if(v&&y>=0&&y<ROWS&&x>=0&&x<COLS)b[y][x]=piece.color;
    }));
    return b;
  },[board,piece,pos]);

  const createRoom=()=>{
    const code=Math.random().toString(36).slice(2,7).toUpperCase();
    const url=typeof window!=="undefined"?`${window.location.origin}/?room=${code}`:`/?room=${code}`;
    setRoomCode(code);setRoomUrl(url);setRoomPlayers(player?[player]:[]);setMode("room");
    setNotice("Đã tạo phòng. Chia sẻ QR hoặc mã phòng cho bạn bè.");
  };
  const joinRoom=(code:string)=>{
    const clean=code.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);
    if(!clean){setNotice("Vui lòng nhập mã phòng.");return;}
    setRoomCode(clean);setRoomUrl(typeof window!=="undefined"?`${window.location.origin}/?room=${clean}`:`/?room=${clean}`);
    setRoomPlayers([...(player?[player]:[]),"Bạn bè"]);setMode("room");setNotice(`Đã mở phòng ${clean}.`);
  };
  const loadLeaderboard=async()=>{
    setMode("leaderboard");
    if(supabase){
      const {data,error}=await supabase.from("tetris_scores").select("id,player_name,best_score,created_at").order("best_score",{ascending:false}).limit(50);
      if(data)setScores(data as ScoreRow[]);
      if(error)setNotice("Chưa đọc được bảng xếp hạng. Hãy kiểm tra cấu hình Supabase.");
    } else setNotice("Bảng điểm hiện đang ở chế độ demo trên thiết bị này. Kết nối Supabase để đồng bộ trực tuyến.");
  };
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);const room=params.get("room");
    if(room){setRoomInput(room);joinRoom(room);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const saveName=()=>{
    const n=nameInput.trim().slice(0,24);if(!n){setNotice("Nhập tên người chơi.");return;}
    setPlayer(n);localStorage.setItem("tetris-pro-name",n);setNotice(`Xin chào ${n}!`);
  };
  const copyRoom=async()=>{
    try{await navigator.clipboard.writeText(roomUrl);setNotice("Đã sao chép link phòng.");}
    catch{setNotice("Hãy sao chép link phòng từ thanh địa chỉ trình duyệt.");}
  };

  return <main className="tetris-root app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><Gamepad2 size={23}/></span><span>TETRIS<span className="brand-accent"> PRO</span><small>ONLINE ARCADE</small></span></a>
      <div className="top-actions"><span className={`connection ${connected?"online":""}`}>{connected?<Wifi size={15}/>:<WifiOff size={15}/>} {connected?"SUPABASE READY":"LOCAL DEMO"}</span><button className="icon-btn" onClick={()=>setMuted(v=>!v)} aria-label="Bật tắt âm thanh">{muted?<VolumeX/>:<Volume2/>}</button></div>
    </header>
    <section className="hero">
      <div className="eyebrow"><span className="pulse"/> ARCADE • PLAY • COMPETE</div>
      <h1>XẾP KHỐI.<br/><span>PHÁ KỶ LỤC.</span></h1>
      <p>Thử thách phản xạ, chinh phục điểm cao và thi đấu cùng bạn bè ở bất cứ đâu.</p>
      <div className="hero-buttons"><button className="primary-btn" onClick={()=>{setMode("solo");startGame();}}><Play size={17} fill="currentColor"/> CHƠI NGAY</button><button className="secondary-btn" onClick={createRoom}><Users size={17}/> TẠO PHÒNG</button></div>
    </section>
    <nav className="tabs">
      <button className={mode==="solo"?"active":""} onClick={()=>setMode("solo")}><Gamepad2 size={16}/> Game</button>
      <button className={mode==="room"?"active":""} onClick={()=>setMode("room")}><Users size={16}/> Phòng thi đấu</button>
      <button className={mode==="leaderboard"?"active":""} onClick={loadLeaderboard}><Trophy size={16}/> Bảng xếp hạng</button>
    </nav>
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    <section className="content-grid">
      <div className="game-card">
        <div className="card-heading"><div><span className="section-kicker">01 / PLAYGROUND</span><h2>Khu vực chơi</h2></div><span className="live-tag"><span/> LIVE GAME</span></div>
        <div className="game-layout">
          <div className="board-frame">
            <div className="board" aria-label="Bàn chơi Tetris">{visibleBoard.flatMap((row,y)=>row.map((cell,x)=><div key={`${y}-${x}`} className={`cell ${cell?"filled":""}`} style={cell?{"--block-color":cell} as React.CSSProperties:{}}/>))}</div>
            {!running&&<div className="board-overlay"><div className="overlay-icon">{gameOver?"🏆":"▦"}</div><h3>{gameOver?"HẾT LƯỢT!":"SẴN SÀNG?"}</h3><p>{gameOver?`${timedMode&&timeLeft===0?"Hết giờ! ":""}Bạn đạt ${score.toLocaleString("vi-VN")} điểm`:"Nhấn Chơi ngay để bắt đầu"}</p><button className="primary-btn small" onClick={startGame}><Play size={15} fill="currentColor"/> {gameOver?"CHƠI LẠI":"BẮT ĐẦU"}</button>{gameOver&&<button className="secondary-btn small-result" onClick={loadLeaderboard}><Trophy size={14}/> XEM XẾP HẠNG</button>}</div>}
          </div>
          <aside className="game-side">
            <div className="stat-box"><span>ĐIỂM SỐ</span><strong>{score.toLocaleString("vi-VN")}</strong></div>
            <div className="stat-row"><div className="mini-stat"><span>LEVEL</span><b>{level}</b></div><div className="mini-stat"><span>LINES</span><b>{lines}</b></div></div><div className={`stat-box timer-stat ${timedMode&&timeLeft<=30?"timer-warning":""}`}><span>{timedMode?"THỜI GIAN CÒN LẠI":"CHẾ ĐỘ THỜI GIAN"}</span><strong>{timedMode?`${String(Math.floor(timeLeft/60)).padStart(2,"0")}:${String(timeLeft%60).padStart(2,"0")}`:"∞"}</strong><div className="timer-options"><label><input type="checkbox" checked={timedMode} onChange={e=>{setTimedMode(e.target.checked);setTimeLeft(durationMinutes*60);setFinalRanked(false);}}/> Giới hạn thời gian</label><select value={durationMinutes} onChange={e=>{setDurationMinutes(Number(e.target.value));setTimeLeft(Number(e.target.value)*60);}} disabled={running&&timedMode}><option value={1}>1 phút</option><option value={3}>3 phút</option><option value={5}>5 phút</option><option value={10}>10 phút</option></select></div></div>
            <div className="next-box"><span>KHỐI TIẾP THEO</span><div className="mini-piece">{next.shape.flatMap((row,y)=>row.map((v,x)=><i key={`${y}-${x}`} style={v?{background:next.color,boxShadow:`0 0 10px ${next.color}`}:{opacity:0}}/>))}</div></div>
            <div className="controls"><span>ĐIỀU KHIỂN</span><p>← → Di chuyển</p><p>↑ Xoay khối</p><p>↓ Rơi nhanh</p><p>SPACE Thả khối</p><p>ESC Tạm dừng</p></div>
            <div className="game-actions"><button onClick={()=>setRunning(v=>!v)} disabled={gameOver}><Pause size={15}/>{running?"TẠM DỪNG":"TIẾP TỤC"}</button><button onClick={startGame}><RotateCcw size={15}/> CHƠI LẠI</button></div>
          </aside>
        </div>
        <div className="mobile-controls"><button onClick={()=>move(-1,0)}>←</button><button onClick={rotatePiece}>↻</button><button onClick={()=>move(0,1)}>↓</button><button onClick={()=>move(1,0)}>→</button></div>
      </div>
      <aside className="right-column">
        <div className="panel player-panel"><div className="card-heading"><div><span className="section-kicker">PLAYER PROFILE</span><h2>Người chơi</h2></div><div className="avatar">{(player||"?").slice(0,1).toUpperCase()}</div></div><label htmlFor="player-name">Tên hiển thị</label><div className="input-row"><input id="player-name" value={nameInput} maxLength={24} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveName()} placeholder="Nhập tên của bạn"/><button onClick={saveName}>Lưu</button></div><div className="profile-foot"><span>Hồ sơ hiện tại</span><b>{player||"Khách"}</b></div></div>
        <div className="panel room-panel"><div className="card-heading"><div><span className="section-kicker">MULTIPLAYER</span><h2>Thi đấu cùng bạn</h2></div><Users size={22} className="panel-icon"/></div><p>Tạo phòng riêng, chia sẻ QR và thách đấu bạn bè xem ai đạt điểm cao nhất.</p><button className="wide-primary" onClick={createRoom}><QrCode size={17}/> TẠO PHÒNG & MÃ QR <ArrowRight size={17}/></button><div className="join-row"><input value={roomInput} onChange={e=>setRoomInput(e.target.value)} placeholder="Nhập mã phòng"/><button onClick={()=>joinRoom(roomInput)}>THAM GIA</button></div></div>
        <div className="panel leaderboard-panel"><div className="card-heading"><div><span className="section-kicker">HALL OF FAME</span><h2>Bảng xếp hạng</h2></div><Trophy size={22} className="panel-icon"/></div><div className="leaderboard-list">{scores.slice(0,5).map((s,i)=><div className="leader-row" key={s.id}><span className={`rank rank-${i+1}`}>{i===0?<Crown size={15}/>:String(i+1).padStart(2,"0")}</span><span className="leader-name">{s.player_name}</span><b>{s.best_score.toLocaleString("vi-VN")}</b></div>)}{scores.length===0&&<div className="empty-state">Chưa có điểm số. Hãy chơi lượt đầu tiên!</div>}</div><button className="text-link" onClick={loadLeaderboard}>XEM BẢNG ĐIỂM <ArrowRight size={14}/></button></div>
      </aside>
    </section>
    {mode==="room"&&<section className="panel room-detail"><div className="card-heading"><div><span className="section-kicker">ROOM LOBBY</span><h2>Phòng thi đấu {roomCode&&<span className="room-code">#{roomCode}</span>}</h2></div><span className="live-tag"><span/> WAITING</span></div><div className="room-detail-grid"><div className="qr-card"><div className="qr-white">{roomUrl?<QRCodeSVG value={roomUrl} size={190} level="H" includeMargin/>:<QrCode size={90}/>}</div><p>Quét mã bằng camera điện thoại để tham gia</p><button className="secondary-btn" onClick={copyRoom}><Copy size={15}/> SAO CHÉP LINK PHÒNG</button></div><div className="room-info"><label>MÃ PHÒNG</label><div className="room-code-large">{roomCode||"—"}</div><p>Chia sẻ mã này cho bạn bè hoặc gửi link phòng qua Zalo, Messenger.</p><div className="room-members"><h3><Users size={17}/> Người chơi ({roomPlayers.length})</h3>{roomPlayers.map((n,i)=><div className="member" key={`${n}-${i}`}><span className="member-avatar">{n.slice(0,1).toUpperCase()}</span><span>{n}</span><small>{i===0?"CHỦ PHÒNG":"ĐÃ THAM GIA"}</small></div>)}</div><button className="primary-btn" onClick={()=>{setMode("solo");startGame();setNotice("Bắt đầu lượt chơi! Bản MVP hiện chạy game độc lập trên mỗi thiết bị.");}}><Play size={16} fill="currentColor"/> BẮT ĐẦU LƯỢT CHƠI</button><p className="fine-print">Bản khởi tạo hiện có giao diện tạo phòng/QR. Đồng bộ phòng và thi đấu thời gian thực cần cấu hình Supabase và phần xử lý phòng phía máy chủ.</p></div></div></section>}
    {mode==="leaderboard"&&<section className="panel full-leaderboard"><div className="card-heading"><div><span className="section-kicker">GLOBAL RANKINGS</span><h2>Bảng xếp hạng trực tuyến</h2></div><Trophy size={25} className="panel-icon"/></div><div className="table-head"><span>HẠNG</span><span>NGƯỜI CHƠI</span><span>ĐIỂM CAO NHẤT</span></div>{scores.map((s,i)=><div className="table-row" key={s.id}><span className={`rank rank-${i+1}`}>{i===0?<Crown size={15}/>:i+1}</span><b>{s.player_name}</b><strong>{s.best_score.toLocaleString("vi-VN")}</strong></div>)}{scores.length===0&&<div className="empty-state">Chưa có dữ liệu. Kết nối Supabase và lưu điểm để tạo bảng xếp hạng.</div>}</section>}
    <footer><div className="brand footer-brand"><span className="brand-icon"><Gamepad2 size={19}/></span><span>TETRIS<span className="brand-accent"> PRO</span></span></div><span>BUILT TO PLAY. MADE TO COMPETE.</span><span>© 2026 Tetris Pro Online</span></footer>
  </main>;
}
