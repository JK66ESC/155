const qsPath = 'data/questions.json';
let questions = [];
let selected = {};
let currentIndex = 0;
let totalQuestions = 20;
let timer = {seconds:0, running:false, interval:null, duration:3600}; // default 60min

const el = id=>document.getElementById(id);

function conciseOption(text){
  // Preserve full option text to ensure answers are never truncated.
  if(!text) return '';
  return String(text).trim();
}

async function loadQuestions(){
  const res = await fetch(qsPath);
  questions = await res.json();
  questions = questions.map(q => {
    q.options_full = q.options.slice();
    q.options = q.options.map(o => conciseOption(o));
    q.question = String(q.question || '').trim();
    return q;
  });
}

async function loadFocusedQuestions(){
  const res = await fetch('data/focused_questions.json');
  let fq = await res.json();
  fq = fq.map(q => {
    q.options_full = q.options.slice();
    q.options = q.options.map(o => conciseOption(o));
    q.question = String(q.question || '').trim();
    return q;
  });
  return fq;
}

function prepareQuestionsFromPool(pool, desiredCount){
  const total = desiredCount || pool.length;
  const poolCopy = [...pool];
  const shuffled = poolCopy.sort(()=>Math.random()-0.5).slice(0,total);
  const prepared = shuffled.map(q=>{
    const opts = q.options.map((text,idx)=>({text, idx}));
    for(let i=opts.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [opts[i],opts[j]] = [opts[j],opts[i]];
    }
    const options_shuffled = opts.map(o=>o.text);
    const answer_shuffled = opts.findIndex(o=>o.idx===q.answer);
    const correctText = q.options_full ? q.options_full[q.answer] : q.options[q.answer];
    // also create a shuffled-full-options array (original full wording) for reporting
    const options_shuffled_full = opts.map(o => (q.options_full ? q.options_full[o.idx] : q.options[o.idx]));
    return Object.assign({}, q, {options_shuffled, options_shuffled_full, answer_shuffled, correctText});
  });

  // Balance answer positions
  (function balancePositions(){
    const n = (prepared[0] && prepared[0].options_shuffled.length) || 4;
    const desired = new Array(n).fill(Math.floor(total / n));
    for(let i=0;i<total % n;i++) desired[i]++;

    function counts(){
      const c = new Array(n).fill(0);
      prepared.forEach(q=>{ c[q.answer_shuffled]++; });
      return c;
    }

    function leftRotate(arr,k){ if(k===0) return arr; return arr.slice(k).concat(arr.slice(0,k)); }

    let c = counts();
    let safety = 10000;
    while(safety-- > 0){
      const over = c.findIndex((v,i)=>v>desired[i]);
      const under = c.findIndex((v,i)=>v<desired[i]);
      if(over===-1 || under===-1) break;
      const qi = prepared.findIndex(q=>q.answer_shuffled===over);
      if(qi===-1) break;
      const q = prepared[qi];
      const currentIndex = q.options_shuffled.indexOf(q.correctText);
      const k = (currentIndex - under + n) % n;
      q.options_shuffled = leftRotate(q.options_shuffled,k);
      q.answer_shuffled = q.options_shuffled.indexOf(q.correctText);
      c = counts();
    }
    const final = counts();
  })();

  return prepared;
}

function startTest(timed=true){
  totalQuestions = parseInt(el('numQuestions').value,10)||20;
  questions = prepareQuestionsFromPool(questions, totalQuestions);
  selected = {};
  currentIndex = 0;
  el('qTotal').textContent = totalQuestions;
  el('qIndex').textContent = 1;
  el('intro').classList.add('hidden');
  el('resultArea').classList.add('hidden');
  el('quizArea').classList.remove('hidden');
  if(timed){
    timer.duration = 60*60; // 60 minutes
    timer.seconds = timer.duration;
    startTimer();
  } else {
    stopTimer();
    el('timeDisplay').textContent = 'Untimed';
  }
  renderQuestion();
}

async function startFocusedTest(timed=true){
  const pool = await loadFocusedQuestions();
  totalQuestions = parseInt(el('numQuestions').value,10)||pool.length;
  questions = prepareQuestionsFromPool(pool, totalQuestions);
  selected = {};
  currentIndex = 0;
  el('qTotal').textContent = totalQuestions;
  el('qIndex').textContent = 1;
  el('intro').classList.add('hidden');
  el('resultArea').classList.add('hidden');
  el('quizArea').classList.remove('hidden');
  if(timed){ timer.duration = 60*60; timer.seconds = timer.duration; startTimer(); }
  else { stopTimer(); el('timeDisplay').textContent = 'Untimed'; }
  renderQuestion();
}

function startTimer(){
  stopTimer();
  timer.running = true;
  updateTimerDisplay();
  timer.interval = setInterval(()=>{
    timer.seconds--;
    updateTimerDisplay();
    if(timer.seconds<=0){
      stopTimer();
      submitQuiz();
      alert('Time is up — submitting your test.');
    }
  },1000);
}

function stopTimer(){
  timer.running=false;
  if(timer.interval)clearInterval(timer.interval);
  timer.interval=null;
}

function updateTimerDisplay(){
  const s = Math.max(0,timer.seconds);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  el('timeDisplay').textContent = `${hh}:${mm}:${ss}`;
}

function renderQuestion(){
  const q = questions[currentIndex];
  el('questionText').textContent = `${currentIndex+1}. ${q.question}`;
  el('options').innerHTML = '';
  const displayOptions = q.options_shuffled || q.options;
  displayOptions.forEach((opt,i)=>{
    const id = `opt_${currentIndex}_${i}`;
    const wrap = document.createElement('label');
    wrap.className='option';
    wrap.htmlFor = id;
    const input = document.createElement('input');
    input.type='radio';
    input.name='answer';
    input.id = id;
    input.value = i;
    input.tabIndex = 0;
    input.checked = (selected[currentIndex]===i);
    input.addEventListener('change', ()=>{ selected[currentIndex]=i; });
    const span = document.createElement('span');
    span.textContent = opt;
    wrap.appendChild(input);
    wrap.appendChild(span);
    el('options').appendChild(wrap);
  });
  el('qIndex').textContent = currentIndex+1;
  // Only show Submit on the final question
  const submitBtn = el('submitBtn');
  if(submitBtn) submitBtn.style.display = 'none';

  // Update Next button: replace text with 'Finish' on final question and change handler
  const nextBtn = el('nextBtn');
  if(nextBtn){
    if(currentIndex === (totalQuestions - 1)){
      nextBtn.textContent = 'Finish';
      nextBtn.onclick = ()=>{ if(confirm('Submit your answers?')) submitQuiz(); };
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.onclick = nextQuestion;
    }
  }
}

function nextQuestion(){
  if(currentIndex < totalQuestions-1){ currentIndex++; renderQuestion(); }
}
function prevQuestion(){ if(currentIndex>0){ currentIndex--; renderQuestion(); }}

function submitQuiz(){
  stopTimer();
  // Score
  let score=0;
  const review=[];
  for(let i=0;i<questions.length;i++){
    const q = questions[i];
    const ans = selected[i];
    const correct = (typeof q.answer_shuffled === 'number')? q.answer_shuffled : q.answer;
    const ok = (ans===correct);
    if(ok)score++;
    const opts_display = q.options_shuffled || q.options;
    // prefer full wording for reports (if available)
    const opts_full = q.options_shuffled_full || q.options_full || opts_display;
    review.push({index:i+1,question:q.question,selected:ans,correct,options:opts_display,options_full:opts_full});
  }
  el('scoreSummary').innerHTML = `<p><strong>Score:</strong> ${score} / ${questions.length} (${Math.round(score/questions.length*100)}%)</p>`;
  el('reviewList').innerHTML = review.map(r=>{
    const sel = r.selected==null?'<em>Unanswered</em>':`Your answer: ${escapeHtml(r.options_full[r.selected]||r.options[r.selected]||'')}`;
    const cor = `Correct answer: ${escapeHtml(r.options_full[r.correct]||r.options[r.correct]||'')}`;
    const cls = (r.selected===r.correct)?'correct':'incorrect';
    return `<li><div><strong>Q${r.index}:</strong> ${escapeHtml(r.question)}</div><div class="${cls}">${sel} — ${cor}</div></li>`;
  }).join('');
  el('quizArea').classList.add('hidden');
  el('resultArea').classList.remove('hidden');
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

function reviewAnswers(){ window.print(); }

function exportCSV(){
  // Build CSV from current questions and selected answers using full wording
  const rows = [];
  rows.push(['Q#','Question','Your answer','Correct answer','Correct?']);
  for(let i=0;i<questions.length;i++){
    const q = questions[i];
    const sel = selected[i];
    const correct = (typeof q.answer_shuffled === 'number')? q.answer_shuffled : q.answer;
    const opts_full = q.options_shuffled_full || q.options_full || q.options;
    const your = (sel==null)? '' : (opts_full[sel]||'');
    const cor = opts_full[correct]||'';
    const ok = (sel===correct)? 'yes':'no';
    rows.push([i+1, q.question, your, cor, ok]);
  }
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz_results_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function restart(){ el('intro').classList.remove('hidden'); el('quizArea').classList.add('hidden'); el('resultArea').classList.add('hidden'); }

// Event bindings
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadQuestions();
  el('startBtn').addEventListener('click', ()=>startTest(true));
  el('practiceBtn').addEventListener('click', ()=>startTest(false));
  const fb = el('focusedBtn'); if(fb) fb.addEventListener('click', ()=>startFocusedTest(true));
  // Next button handlers are set by renderQuestion so no static listener here
  const csvBtn = el('csvBtn'); if(csvBtn) csvBtn.addEventListener('click', exportCSV);
  el('prevBtn').addEventListener('click', prevQuestion);
  el('submitBtn').addEventListener('click', ()=>{ if(confirm('Submit your answers?')) submitQuiz(); });
  el('reviewBtn').addEventListener('click', reviewAnswers);
  el('printBtn').addEventListener('click', ()=>window.print());
  el('restartBtn').addEventListener('click', restart);
  // keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowRight') nextQuestion();
    if(e.key==='ArrowLeft') prevQuestion();
    if(e.key==='Enter' && document.activeElement && document.activeElement.tagName!=='INPUT') e.preventDefault();
  });
});
