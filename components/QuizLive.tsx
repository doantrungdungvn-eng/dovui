"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, configured } from "@/lib/supabase";
import { Radio, Trophy, Users, Smartphone, MonitorPlay, Settings, Plus, Upload, Play, ChevronRight, Clock3, CheckCircle2, XCircle, Copy, RefreshCw, LogIn, Crown, Zap, BookOpen, QrCode, Eye, EyeOff } from "lucide-react";
import * as XLSX from "xlsx";

type Question = { id?: string; prompt: string; options: string[]; correct_index: number; seconds: number; points: number };
type Room = { id: string; code: string; status: string; current_question: number; question_started_at: string | null; question_ends_at: string | null; title: string };
type Player = { id: string; nickname: string; total_score: number; correct_count: number };
const sampleQuestions: Question[] = [
 {prompt:"Thủ đô của Việt Nam là thành phố nào?",options:["Đà Nẵng","Hà Nội","Huế","Cần Thơ"],correct_index:1,seconds:15,points:1000},
 {prompt:"Một tuần có bao nhiêu ngày?",options:["5 ngày","6 ngày","7 ngày","8 ngày"],correct_index:2,seconds:10,points:1000},
 {prompt:"Hành tinh nào được gọi là Hành tinh Đỏ?",options:["Sao Kim","Sao Hỏa","Sao Mộc","Sao Thủy"],correct_index:1,seconds:15,points:1000},
 {prompt:"Loài vật nào được gọi là chúa sơn lâm?",options:["Voi","Hổ","Khỉ","Gấu trúc"],correct_index:1,seconds:12,points:1000},
 {prompt:"2 + 3 × 2 bằng bao nhiêu?",options:["10","12","8","7"],correct_index:3,seconds:12,points:1000},
 {prompt:"Màu nào được tạo ra khi trộn xanh dương và vàng?",options:["Tím","Cam","Xanh lá","Nâu"],correct_index:2,seconds:15,points:1000},
 {prompt:"Đại dương lớn nhất thế giới là gì?",options:["Đại Tây Dương","Ấn Độ Dương","Bắc Băng Dương","Thái Bình Dương"],correct_index:3,seconds:15,points:1000},
 {prompt:"Một năm thường có bao nhiêu tháng?",options:["10","11","12","13"],correct_index:2,seconds:10,points:1000},
 {prompt:"Con vật nào sống dưới nước và thở bằng mang?",options:["Mèo","Cá","Gà","Thỏ"],correct_index:1,seconds:12,points:1000},
 {prompt:"Ngày Quốc khánh Việt Nam là ngày nào?",options:["30/4","1/5","2/9","20/11"],correct_index:2,seconds:15,points:1000}
];
const colors = ["#ef4444","#2563eb","#eab308","#16a34a"];
const letters = ["A","B","C","D"];

export default function QuizLive() {
 const [tab,setTab] = useState<"home"|"host"|"play"|"admin"|"board">("home");
 const [roomCode,setRoomCode] = useState("");
 const [nickname,setNickname] = useState("");
 const [room,setRoom] = useState<Room|null>(null);
 const [player,setPlayer] = useState<Player|null>(null);
 const [players,setPlayers] = useState<Player[]>([]);
 const [questions,setQuestions] = useState<Question[]>(sampleQuestions);
 const [questionIndex,setQuestionIndex] = useState(0);
 const [selected,setSelected] = useState<number|null>(null);
 const [hasAnswered,setHasAnswered] = useState(false);
 const [showCorrect,setShowCorrect] = useState(false);
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState("");
 const [title,setTitle] = useState("Quiz Live");
 const [adminPin,setAdminPin] = useState("");
 const [showPin,setShowPin] = useState(false);
 const [newQuestion,setNewQuestion] = useState<Question>({prompt:"",options:["","","",""],correct_index:0,seconds:15,points:1000});
 const [questionRows,setQuestionRows] = useState<any[]>([]);
 const [top,setTop] = useState<Player[]>([]);
 const [answerCount,setAnswerCount] = useState(0);
 const [timer,setTimer] = useState(0);

 const activeQuestion = useMemo(()=>questions[questionIndex] || null,[questions,questionIndex]);

 useEffect(()=>{
   if (!room?.id) return;
   const channel = supabase.channel(`room-${room.id}`)
     .on("postgres_changes",{event:"*",schema:"public",table:"quiz_rooms",filter:`id=eq.${room.id}`},payload=>{
       const next = payload.new as Room;
       if(next?.id){setRoom(next); setQuestionIndex(next.current_question ?? 0); if(next.status==="reveal"||next.status==="finished") setShowCorrect(true); else setShowCorrect(false);}
     })
     .on("postgres_changes",{event:"*",schema:"public",table:"quiz_players",filter:`room_id=eq.${room.id}`},()=>refreshPlayers(room.id))
     .on("postgres_changes",{event:"*",schema:"public",table:"quiz_answers",filter:`room_id=eq.${room.id}`},()=>refreshAnswerCount(room.id))
     .subscribe();
   refreshPlayers(room.id); refreshAnswerCount(room.id);
   return ()=>{supabase.removeChannel(channel);};
 },[room?.id]);

 useEffect(()=>{
   if (!room?.id || room.status!=="question" || !room.question_ends_at) {setTimer(0); return;}
   const tick=()=>setTimer(Math.max(0,Math.ceil((new Date(room.question_ends_at!).getTime()-Date.now())/1000)));
   tick(); const id=setInterval(tick,250); return ()=>clearInterval(id);
 },[room?.id,room?.status,room?.question_ends_at]);

 async function refreshPlayers(id:string) {
   const {data}=await supabase.from("quiz_players").select("id,nickname,total_score,correct_count").eq("room_id",id).order("total_score",{ascending:false}).limit(100);
   if(data){setPlayers(data as Player[]);setTop(data.slice(0,10) as Player[]);}
 }
 async function refreshAnswerCount(id:string) {
   const {count}=await supabase.from("quiz_answers").select("*",{count:"exact",head:true}).eq("room_id",id).eq("question_index",questionIndex);
   setAnswerCount(count||0);
 }
 function notify(s:string){setMessage(s);setTimeout(()=>setMessage(""),4000);}
 async function createRoom(){
   if(!configured){notify("Hãy cấu hình URL và anon key của Supabase trước.");return;}
   setBusy(true);
   const code=Math.random().toString(36).slice(2,8).toUpperCase();
   const {data,error}=await supabase.from("quiz_rooms").insert({code,title,status:"lobby",current_question:0,question_started_at:null,question_ends_at:null}).select().single();
   if(error){notify(error.message);setBusy(false);return;}
   const qs=questions.length?questions:sampleQuestions;
   const {error:qerr}=await supabase.from("quiz_questions").insert(qs.map((q,i)=>({room_id:data.id,question_index:i,prompt:q.prompt,options:q.options,correct_index:q.correct_index,seconds:q.seconds,points:q.points})));
   if(qerr){notify("Tạo phòng được nhưng lưu câu hỏi lỗi: "+qerr.message);setBusy(false);return;}
   setRoom(data as Room);setQuestionIndex(0);setTab("host");notify("Đã tạo phòng "+code);setBusy(false);
 }
 async function joinRoom(){
   if(!configured){notify("Hãy cấu hình Supabase trước.");return;}
   if(!nickname.trim()||!roomCode.trim()){notify("Nhập tên và mã phòng.");return;}
   setBusy(true);
   const {data:r,error}=await supabase.from("quiz_rooms").select("*").eq("code",roomCode.trim().toUpperCase()).single();
   if(error||!r){notify("Không tìm thấy phòng. Kiểm tra lại mã phòng.");setBusy(false);return;}
   const {data:qs}=await supabase.from("quiz_questions").select("*").eq("room_id",r.id).order("question_index");
   if(qs?.length)setQuestions(qs.map((q:any)=>({id:q.id,prompt:q.prompt,options:q.options,correct_index:q.correct_index,seconds:q.seconds,points:q.points})));
   const {data:p,error:pe}=await supabase.from("quiz_players").insert({room_id:r.id,nickname:nickname.trim().slice(0,30),total_score:0,correct_count:0}).select().single();
   if(pe){notify(pe.message);setBusy(false);return;}
   setRoom(r as Room);setPlayer(p as Player);setQuestionIndex(r.current_question||0);setSelected(null);setHasAnswered(false);setShowCorrect(r.status==="reveal");setTab("play");setBusy(false);
 }
 async function hostStartQuestion(){
   if(!room)return;
   const q=questions[questionIndex];
   if(!q){await supabase.from("quiz_rooms").update({status:"finished",question_started_at:null,question_ends_at:null}).eq("id",room.id);setRoom({...room,status:"finished"});return;}
   const start=new Date(); const end=new Date(start.getTime()+q.seconds*1000);
   const {error}=await supabase.from("quiz_rooms").update({status:"question",current_question:questionIndex,question_started_at:start.toISOString(),question_ends_at:end.toISOString()}).eq("id",room.id);
   if(error){notify(error.message);return;}
   setShowCorrect(false);setSelected(null);setHasAnswered(false);setAnswerCount(0);
 }
 async function revealAnswers(){
   if(!room)return;
   const {error}=await supabase.from("quiz_rooms").update({status:"reveal",question_ends_at:null}).eq("id",room.id);
   if(error)notify(error.message); else {setShowCorrect(true);await refreshPlayers(room.id);}
 }
 async function nextQuestion(){
   if(!room)return;
   const next=questionIndex+1;
   if(next>=questions.length){
     const {error}=await supabase.from("quiz_rooms").update({status:"finished",question_ends_at:null,question_started_at:null}).eq("id",room.id);
     if(error){notify("Không thể kết thúc phòng: "+error.message);return;}
     setRoom({...room,status:"finished",question_started_at:null,question_ends_at:null});setTab("board");await refreshPlayers(room.id);return;
   }
   // Advance directly into the next live question so players do not get stuck
   // on the waiting screen or require a second click from the host.
   const q=questions[next];
   const start=new Date();
   const end=new Date(start.getTime()+q.seconds*1000);
   const patch={status:"question",current_question:next,question_started_at:start.toISOString(),question_ends_at:end.toISOString()};
   const {error}=await supabase.from("quiz_rooms").update(patch).eq("id",room.id);
   if(error){notify("Không thể mở câu tiếp theo: "+error.message);return;}
   setQuestionIndex(next);
   setRoom({...room,...patch});
   setSelected(null);setHasAnswered(false);setShowCorrect(false);setAnswerCount(0);
 }
 async function submitAnswer(index:number){
   if(!room||!player||hasAnswered||selected!==null||room.status!=="question"||timer<=0)return;
   setSelected(index);setHasAnswered(true);
   const q=activeQuestion;if(!q)return;
   const started=room.question_started_at?new Date(room.question_started_at).getTime():Date.now();
   const elapsed=Math.max(0,Date.now()-started);
   const remaining=Math.max(0,1-elapsed/(q.seconds*1000));
   const isCorrect=index===q.correct_index;
   const score=isCorrect?Math.max(100,Math.round(q.points*(0.5+0.5*remaining))):0;
   const {error}=await supabase.rpc("submit_quiz_answer",{p_room_id:room.id,p_player_id:player.id,p_question_index:questionIndex,p_selected_index:index,p_score:score,p_is_correct:isCorrect,p_elapsed_ms:Math.round(elapsed)});
   if(error){notify(error.message);setHasAnswered(false);setSelected(null);} else notify(isCorrect?"Đã ghi nhận câu trả lời!":"Đã ghi nhận đáp án.");
 }
 async function addQuestion(){
   if(!newQuestion.prompt.trim()||newQuestion.options.some(x=>!x.trim())){notify("Nhập câu hỏi và đủ 4 đáp án.");return;}
   setQuestions(prev=>[...prev,{...newQuestion,options:[...newQuestion.options]}]);
   setNewQuestion({prompt:"",options:["","","",""],correct_index:0,seconds:15,points:1000});
   notify("Đã thêm câu hỏi vào bộ câu hỏi hiện tại.");
 }
 function importExcel(file?:File){
   if(!file)return;
   const reader=new FileReader();
   reader.onload=e=>{
     try{
       const workbook=XLSX.read(e.target?.result,{type:"array"});
       const rows=XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]],{defval:""});
       const parsed=rows.map((r:any)=>({
         prompt:String(r.question??r.Question??r["Câu hỏi"]??r["Cau hoi"]??"").trim(),
         options:[r.A??r.a??r["Đáp án A"]??"",r.B??r.b??r["Đáp án B"]??"",r.C??r.c??r["Đáp án C"]??"",r.D??r.d??r["Đáp án D"]??""].map(String),
         correct_index:Math.max(0,["A","B","C","D"].indexOf(String(r.correct??r.Correct??r["Đáp án đúng"]??"A").trim().toUpperCase().replace("ĐÁP ÁN ",""))),
         seconds:Number(r.seconds??r.Seconds??r["Thời gian"]??15)||15,
         points:Number(r.points??r.Points??r["Điểm"]??1000)||1000
       })).filter((q:Question)=>q.prompt&&q.options.every(x=>x.trim()));
       if(!parsed.length){notify("Không đọc được câu hỏi. Hãy kiểm tra mẫu Excel.");return;}
       setQuestions(parsed);notify(`Đã nhập ${parsed.length} câu hỏi.`);
     }catch{notify("Không đọc được file Excel.");}
   };reader.readAsArrayBuffer(file);
 }
 async function copyCode(){if(room?.code){await navigator.clipboard?.writeText(room.code);notify("Đã sao chép mã phòng.");}}
 const urlJoin=typeof window!=="undefined"?`${window.location.origin}/?join=${room?.code||""}`:"";
 const qrImageUrl=urlJoin?`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(urlJoin)}`:"";
 useEffect(()=>{if(typeof window!=="undefined"){const c=new URLSearchParams(window.location.search).get("join");if(c){setRoomCode(c);setTab("play");}}},[]);

 return <main className="app-shell">
  <header className="topbar"><a className="brand" href="#" onClick={e=>{e.preventDefault();setTab("home")}}><span className="brand-mark"><Radio size={23}/></span><span>QUIZ<span className="brand-light">LIVE</span><small>PLAY · LEARN · WIN</small></span></a><nav><button className={tab==="host"?"nav-active":""} onClick={()=>setTab("host")}><MonitorPlay size={17}/> MC / TV</button><button className={tab==="play"?"nav-active":""} onClick={()=>setTab("play")}><Smartphone size={17}/> Người chơi</button><button className={tab==="admin"?"nav-active":""} onClick={()=>setTab("admin")}><Settings size={17}/> Quản trị</button></nav><div className="online-pill"><span/> LIVE QUIZ</div></header>
  {!configured&&<div className="config-warning"><strong>Chưa kết nối Supabase.</strong> Hãy tạo project Supabase, chạy file <code>supabase/schema.sql</code> và thêm biến môi trường vào Vercel. Bạn vẫn có thể xem giao diện demo.</div>}
  {message&&<div className="toast">{message}</div>}
  {tab==="home"&&<section className="hero-wrap"><div className="hero-copy"><div className="eyebrow"><Zap size={15}/> LIVE QUIZ PLATFORM</div><h1>Biến mỗi câu hỏi<br/>thành <span>một cuộc chơi.</span></h1><p>Nền tảng đố vui trực tiếp cho sự kiện, lớp học và đội nhóm. Chiếu câu hỏi trên màn hình lớn, mọi người trả lời bằng điện thoại.</p><div className="hero-actions"><button className="btn-primary" onClick={()=>setTab("host")}><MonitorPlay size={18}/> Bắt đầu làm MC</button><button className="btn-secondary" onClick={()=>setTab("play")}><Smartphone size={18}/> Tham gia chơi <ChevronRight size={17}/></button></div><div className="hero-stats"><div><strong>4 lựa chọn</strong><span>A · B · C · D</span></div><div><strong>Realtime</strong><span>Cập nhật tức thì</span></div><div><strong>TOP 10</strong><span>Vinh danh người chơi</span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="floating-chip chip-one"><Trophy size={17}/> TOP 10</div><div className="floating-chip chip-two"><Users size={17}/> Cùng chơi</div><div className="quiz-card"><div className="quiz-card-head"><span>ROUND 01 / 03</span><span className="live-dot">● LIVE</span></div><div className="mini-progress"><i/></div><div className="mini-q">Thủ đô của Việt Nam là thành phố nào?</div><div className="mini-answers"><div style={{background:colors[0]}}>▲ Hà Nội?</div><div style={{background:colors[1]}}>◆ Đà Nẵng</div><div style={{background:colors[2]}}>● Huế</div><div style={{background:colors[3]}}>■ Cần Thơ</div></div><div className="card-footer"><span><Clock3 size={14}/> 00:12</span><span>128 người đang chơi</span></div></div></div><div className="feature-grid"><article><span className="feature-icon purple"><MonitorPlay/></span><h3>Màn hình MC</h3><p>Điều khiển câu hỏi, đếm ngược và công bố đáp án trên TV.</p></article><article><span className="feature-icon blue"><Smartphone/></span><h3>Trả lời trên mobile</h3><p>Giao diện nút lớn, dễ chọn, không cần cài ứng dụng.</p></article><article><span className="feature-icon gold"><Trophy/></span><h3>Bảng xếp hạng</h3><p>Chấm điểm theo độ chính xác và tốc độ trả lời.</p></article><article><span className="feature-icon green"><BookOpen/></span><h3>Quản lý câu hỏi</h3><p>Tạo câu hỏi trực tiếp hoặc nhập danh sách từ Excel.</p></article></div></section>}
  {tab==="host"&&<section className="workspace"><div className="section-heading"><div><div className="eyebrow">HOST CONSOLE</div><h1>Màn hình MC / TV</h1><p>Điều khiển phòng chơi và trình chiếu câu hỏi.</p></div><span className="status-badge"><span/> {room?.status==="question"?"ĐANG CHƠI":room?.status==="reveal"?"CÔNG BỐ ĐÁP ÁN":room?.status==="finished"?"ĐÃ KẾT THÚC":"SẴN SÀNG"}</span></div>
   {!room?<div className="setup-card"><div className="setup-icon"><MonitorPlay size={28}/></div><h2>Tạo phòng chơi mới</h2><p>Phòng sẽ tạo mã tham gia riêng. Người chơi vào bằng mã này trên điện thoại.</p><label>Tên phòng chơi<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ví dụ: Quiz vui cuối năm"/></label><div className="setup-summary"><span><BookOpen/> {questions.length} câu hỏi</span><span><Clock3/> 10–15 giây/câu</span><span><Trophy/> TOP 10</span></div><button className="btn-primary full" disabled={busy} onClick={createRoom}><Play size={18}/> {busy?"Đang tạo...":"Tạo phòng và bắt đầu"} </button><button className="text-btn" onClick={()=>setTab("admin")}>Chỉnh sửa / nhập câu hỏi trước <ChevronRight size={15}/></button></div>:<div className="host-grid"><div className="host-main"><div className="room-bar"><div><span className="muted-label">MÃ PHÒNG</span><strong className="room-code">{room.code}</strong></div><button className="btn-secondary small" onClick={copyCode}><Copy size={15}/> Sao chép</button><div className="join-link"><QrCode size={18}/><span>Quét QR bằng camera điện thoại để tham gia</span></div><div className="room-qr"><img src={qrImageUrl} alt="QR tham gia phòng Quiz Live"/><strong>QUÉT ĐỂ THAM GIA</strong><span>Mở camera điện thoại và quét mã</span><button className="text-btn" onClick={()=>{if(urlJoin)navigator.clipboard?.writeText(urlJoin);notify("Đã sao chép liên kết tham gia.")}}>Sao chép liên kết</button></div></div>
    <div className="screen-card">{room.status==="lobby"?<div className="lobby-screen"><div className="eyebrow">READY TO PLAY</div><h2>Ai sẵn sàng<br/><span>chinh phục TOP 10?</span></h2><div className="lobby-count"><Users size={25}/><strong>{players.length}</strong><span>người đã tham gia</span></div><div className="lobby-qr"><img src={qrImageUrl} alt="Quét QR để tham gia"/><div><strong>QUÉT QR ĐỂ THAM GIA</strong><p>Mở camera điện thoại hoặc vào {typeof window!=="undefined"?window.location.host:"trang Quiz Live"}</p><b>MÃ PHÒNG: {room.code}</b></div></div><button className="btn-primary" onClick={hostStartQuestion}><Play size={18}/> Bắt đầu câu {questionIndex+1}</button></div>:room.status==="finished"?<div className="lobby-screen"><Trophy size={42} color="#eab308"/><h2>Trò chơi <span>kết thúc!</span></h2><p>Cảm ơn tất cả người chơi.</p><button className="btn-primary" onClick={()=>setTab("board")}>Xem bảng xếp hạng</button></div>:<><div className="question-meta"><span>CÂU {questionIndex+1} / {questions.length}</span><span className="timer-chip"><Clock3 size={15}/> {room.status==="question"?timer:"ĐÃ KHÓA"}</span></div><h2 className="screen-question">{activeQuestion?.prompt}</h2><div className="host-options">{activeQuestion?.options.map((opt,i)=><div key={i} className={`host-option ${showCorrect&&i===activeQuestion.correct_index?"correct":""}`} style={{background:showCorrect&&i===activeQuestion.correct_index?"#15803d":colors[i]}}><b>{letters[i]}</b><span>{opt}</span>{showCorrect&&i===activeQuestion.correct_index&&<CheckCircle2/>}</div>)}</div><div className="screen-bottom"><span><Users size={16}/> {players.length} người chơi</span><span>{answerCount} câu trả lời</span></div></>}</div>
    <div className="host-controls">{room.status==="question"?<button className="btn-primary" onClick={revealAnswers}><Eye size={17}/> Khóa câu hỏi & công bố đáp án</button>:room.status==="reveal"?<button className="btn-primary" onClick={nextQuestion}><ChevronRight size={18}/> {questionIndex+1>=questions.length?"Kết thúc & TOP 10":"Câu tiếp theo"}</button>:room.status==="lobby"?<button className="btn-primary" onClick={hostStartQuestion}><Play size={17}/> Bắt đầu câu hỏi</button>:<button className="btn-primary" onClick={()=>{setRoom(null);setTab("host")}}><RefreshCw size={17}/> Tạo phòng mới</button>}<button className="btn-secondary" onClick={()=>setTab("board")}><Trophy size={17}/> Xem TOP 10</button></div>
   </div><aside className="host-sidebar"><div className="panel-heading"><h3><Users size={18}/> Người chơi</h3><span>{players.length}</span></div>{players.length?players.slice(0,10).map((p,i)=><div className="player-row" key={p.id}><span className={`rank rank-${i+1}`}>{i+1}</span><span className="player-name">{p.nickname}</span><strong>{p.total_score.toLocaleString("vi-VN")}</strong></div>):<div className="empty-state"><Users size={28}/><p>Người chơi sẽ xuất hiện ở đây khi tham gia phòng.</p></div>}<div className="sidebar-note"><Zap size={16}/> Điểm được tính tự động theo độ chính xác và tốc độ.</div></aside></div>}</section>}
  {tab==="play"&&<section className="player-page"><div className="player-shell"><div className="eyebrow"><Radio size={14}/> QUIZ LIVE PLAYER</div>{!player?<><h1>Tham gia<br/><span>cuộc chơi.</span></h1><p>Nhập mã phòng do MC cung cấp và tên bạn muốn hiển thị.</p><label>Mã phòng<input className="code-input" value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase().slice(0,8))} placeholder="VD: A7K9PQ" maxLength={8}/></label><label>Tên người chơi<input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Nhập tên của bạn" maxLength={30}/></label><button className="btn-primary full" disabled={busy} onClick={joinRoom}><LogIn size={18}/> {busy?"Đang vào phòng...":"Vào phòng chơi"}</button><div className="player-tip">✦ Dùng tên dễ nhận biết để MC vinh danh bạn trên bảng TOP 10.</div></>:<><div className="player-welcome"><div><span className="muted-label">BẠN ĐANG CHƠI VỚI TÊN</span><h2>{player.nickname}</h2></div><span className="player-score"><Trophy size={16}/> {players.find(p=>p.id===player.id)?.total_score??player.total_score}</span></div>{room?.status==="lobby"?<div className="waiting-card"><div className="waiting-animation"><Radio size={34}/></div><h2>Đã vào phòng!</h2><p>Nhìn lên màn hình lớn. Câu hỏi sẽ xuất hiện ngay khi MC bắt đầu.</p><div className="waiting-code">MÃ PHÒNG <strong>{room.code}</strong></div></div>:room?.status==="question"&&activeQuestion?<div className="mobile-question"><div className="mobile-q-meta"><span>CÂU {questionIndex+1}</span><span className="timer-chip"><Clock3 size={14}/> {timer}s</span></div><h2>{activeQuestion.prompt}</h2>{hasAnswered?<div className="answer-submitted"><CheckCircle2 size={36}/><h3>Đã khóa câu trả lời!</h3><p>Chờ MC công bố kết quả nhé.</p><div className="selected-answer" style={{background:colors[selected??0]}}>Bạn chọn {letters[selected??0]}</div></div>:<div className="mobile-options">{activeQuestion.options.map((opt,i)=><button key={i} disabled={hasAnswered||timer<=0} onClick={()=>submitAnswer(i)} style={{background:colors[i]}}><b>{letters[i]}</b><span>{opt}</span></button>)}</div>}</div>:room?.status==="reveal"&&activeQuestion?<div className="result-card"><div className={`result-symbol ${selected===activeQuestion.correct_index?"is-correct":"is-wrong"}`}>{selected===activeQuestion.correct_index?<CheckCircle2 size={42}/>:<XCircle size={42}/>}</div><h2>{selected===activeQuestion.correct_index?"Chính xác!":"Chưa chính xác"}</h2><p>Đáp án đúng: <strong>{letters[activeQuestion.correct_index]} · {activeQuestion.options[activeQuestion.correct_index]}</strong></p><div className="result-score"><span>Điểm của bạn</span><strong>{players.find(p=>p.id===player.id)?.total_score??player.total_score}</strong></div><p className="wait-next">Chờ MC chuyển sang câu tiếp theo.</p></div>:room?.status==="finished"?<div className="result-card"><Trophy size={48} color="#eab308"/><h2>Hoàn thành!</h2><p>Cảm ơn bạn đã tham gia.</p><button className="btn-primary full" onClick={()=>setTab("board")}>Xem TOP 10</button></div>:null}</>}</div></section>}
  {tab==="admin"&&<section className="workspace"><div className="section-heading"><div><div className="eyebrow">QUESTION MANAGER</div><h1>Quản trị câu hỏi</h1><p>Tạo câu hỏi trắc nghiệm hoặc nhập từ Excel.</p></div><span className="status-badge"> <BookOpen size={15}/> {questions.length} câu hỏi</span></div><div className="admin-grid"><div className="admin-main"><div className="panel"><div className="panel-heading"><h3><Plus size={18}/> Thêm câu hỏi</h3></div><label>Nội dung câu hỏi<textarea rows={3} value={newQuestion.prompt} onChange={e=>setNewQuestion({...newQuestion,prompt:e.target.value})} placeholder="Nhập nội dung câu hỏi..."/></label><div className="option-editor">{newQuestion.options.map((o,i)=><label key={i}><span className="option-letter" style={{background:colors[i]}}>{letters[i]}</span><input value={o} onChange={e=>setNewQuestion({...newQuestion,options:newQuestion.options.map((x,j)=>i===j?e.target.value:x)})} placeholder={`Đáp án ${letters[i]}`}/></label>)}</div><label>Đáp án đúng<select value={newQuestion.correct_index} onChange={e=>setNewQuestion({...newQuestion,correct_index:Number(e.target.value)})}>{letters.map((l,i)=><option value={i} key={l}>{l} — {newQuestion.options[i]||"Chưa nhập"}</option>)}</select></label><div className="field-row"><label>Thời gian (giây)<input type="number" min={5} max={120} value={newQuestion.seconds} onChange={e=>setNewQuestion({...newQuestion,seconds:Number(e.target.value)})}/></label><label>Điểm tối đa<input type="number" min={100} max={5000} step={100} value={newQuestion.points} onChange={e=>setNewQuestion({...newQuestion,points:Number(e.target.value)})}/></label></div><button className="btn-primary" onClick={addQuestion}><Plus size={17}/> Thêm câu hỏi</button></div><div className="panel"><div className="panel-heading"><h3><Upload size={18}/> Nhập từ Excel</h3></div><p className="panel-help">Tải file .xlsx hoặc .csv. Các cột cần có: <code>question, A, B, C, D, correct</code>. Đáp án đúng ghi A/B/C/D.</p><label className="upload-zone"><Upload size={26}/><strong>Chọn file Excel / CSV</strong><span>Kéo thả hoặc bấm để chọn</span><input type="file" accept=".xlsx,.xls,.csv" onChange={e=>importExcel(e.target.files?.[0])}/></label><button className="text-btn" onClick={()=>{const ws=XLSX.utils.json_to_sheet([{question:"Thủ đô của Việt Nam?",A:"Hà Nội",B:"Huế",C:"Đà Nẵng",D:"Cần Thơ",correct:"A",seconds:15,points:1000}]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Questions");XLSX.writeFile(wb,"quiz-live-template.xlsx");}}><BookOpen size={15}/> Tải file Excel mẫu</button></div></div><aside className="panel question-list"><div className="panel-heading"><h3>Danh sách câu hỏi</h3><span>{questions.length}</span></div>{questions.map((q,i)=><div className="question-list-item" key={i}><span className="question-num">{String(i+1).padStart(2,"0")}</span><div><strong>{q.prompt}</strong><p>{q.seconds}s · {q.points} điểm · Đáp án {letters[q.correct_index]}</p></div><button className="icon-btn" title="Xóa câu hỏi" onClick={()=>setQuestions(prev=>prev.filter((_,j)=>j!==i))}>×</button></div>)}<button className="btn-primary full" onClick={()=>setTab("host")}>Quay lại màn hình MC <ChevronRight size={16}/></button></aside></div><div className="security-note"><Settings size={18}/><div><strong>Quyền quản trị</strong><p>Trong bản triển khai, bảo vệ trang quản trị bằng Supabase Auth và RLS. Không đặt service_role key ở biến NEXT_PUBLIC hoặc trong trình duyệt.</p></div></div></section>}
  {tab==="board"&&<section className="workspace board-page"><div className="section-heading"><div><div className="eyebrow">HALL OF FAME</div><h1>Bảng xếp hạng <span>TOP 10</span></h1><p>Những người chơi có số điểm cao nhất trong phòng.</p></div><button className="btn-secondary" onClick={()=>room&&refreshPlayers(room.id)}><RefreshCw size={16}/> Cập nhật</button></div><div className="podium">{[1,0,2].map((position,i)=>{const p=top[position];return <div className={`podium-person podium-${position+1}`} key={position}>{p?<><div className={`avatar avatar-${position+1}`}>{p.nickname.slice(0,1).toUpperCase()}</div><strong>{p.nickname}</strong><span>{p.total_score.toLocaleString("vi-VN")} điểm</span><div className="podium-block"><Crown size={position===0?26:20}/><b>{position+1}</b></div></>:<><div className="avatar avatar-empty">?</div><strong>Chưa có người chơi</strong><span>— điểm</span><div className="podium-block"><Crown size={20}/><b>{position+1}</b></div></>}</div>})}</div><div className="leaderboard panel"><div className="panel-heading"><h3><Trophy size={19}/> TOP 10 người chơi</h3><span>{top.length} người</span></div>{top.length?top.map((p,i)=><div className={`leader-row ${i<3?"leader-top":""}`} key={p.id}><span className={`leader-rank ${i<3?"rank-"+(i+1):""}`}>{String(i+1).padStart(2,"0")}</span><div className="leader-avatar">{p.nickname.slice(0,1).toUpperCase()}</div><div className="leader-info"><strong>{p.nickname}</strong><span>{p.correct_count} câu đúng</span></div><strong className="leader-score">{p.total_score.toLocaleString("vi-VN")} <small>điểm</small></strong></div>):<div className="empty-state"><Trophy size={30}/><p>Chưa có điểm số. Hãy chơi một vòng quiz để tạo bảng xếp hạng.</p></div>}</div><button className="btn-secondary" onClick={()=>setTab("host")}><ChevronRight size={16}/> Quay lại phòng MC</button></section>}
  <footer className="footer"><span>QUIZ<span className="brand-light">LIVE</span> © 2026</span><span>Made for live moments · Next.js + Supabase</span></footer>
 </main>
}
