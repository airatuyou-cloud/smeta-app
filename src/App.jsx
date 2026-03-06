import { useState, useMemo, useRef, useEffect } from "react";
// Import xlsx library for Excel export/import. This must be installed via package.json dependencies.
import * as XLSX from 'xlsx';

const VAT = 0.22;
const ITAX = 0.25;
const CASH_K = 0.80;
const CREDIT_RATE = 0.25;

const initItems = [
  { id: 1, name: "Поднос 430×230 мм", price: 6830, qty: 30, payType: "vat" },
  { id: 2, name: "Сигнальник",         price: 21000, qty: 1,  payType: "vat" },
  { id: 3, name: "Доставка",           price: 1080,  qty: 4,  payType: "cash" },
];

const initSellItems = [
  { id: 1, name: "Поднос 430×230 мм", qty: 30, sellPrice: 9270, payType: "vat", manual: false },
  { id: 2, name: "Сигнальник",         qty: 1,  sellPrice: 28000, payType: "vat", manual: false },
  { id: 3, name: "Доставка",           qty: 4,  sellPrice: 2000,  payType: "cash", manual: false },
];

// Buyer palette
const B = {
  bg:"#eef2f8", card:"#ffffff", accent:"#1a56a0",
  blue:"#1a56a0", blueLt:"#dbeafe", blueMid:"#93c5fd", blueDk:"#1e3a5f",
  green:"#0f766e", greenLt:"#ccfbf1", greenMid:"#5eead4", greenDk:"#134e4a",
  red:"#b91c1c",  redLt:"#fee2e2",  redMid:"#fca5a5",  redDk:"#7f1d1d",
  border:"#cbd5e1", muted:"#64748b", text:"#0f172a",
};
// Seller palette
const S = {
  bg:"#f0fdf6", card:"#ffffff", accent:"#15803d",
  blue:"#4338ca",  blueLt:"#e0e7ff", blueMid:"#a5b4fc", blueDk:"#312e81",
  green:"#15803d", greenLt:"#dcfce7", greenMid:"#86efac", greenDk:"#14532d",
  red:"#be185d",   redLt:"#fce7f3",  redMid:"#f9a8d4",  redDk:"#831843",
  border:"#bbf7d0", muted:"#6b7280", text:"#0f172a",
};

const fmt = (n) => (isNaN(n)||!isFinite(n)) ? "—" : Math.round(n).toLocaleString("ru-RU")+" ₽";
const fmtp = (n) => (isNaN(n)||!isFinite(n)) ? "—" : (n*100).toFixed(1)+"%";
const uid = () => Date.now() + Math.random();

export default function App() {
  const [tab, setTab]           = useState("buy");
  const [items, setItems]       = useState(initItems);
  const [sellItems, setSellItems] = useState(initSellItems);
  const [akkPct, setAkkPct]     = useState(20);
  const [creditM, setCreditM]   = useState(7);
  const [p1, setP1]             = useState(30);
  const [p2, setP2]             = useState(40);
  const fileRef                 = useRef();
  const sellFileRef             = useRef();
  const allFileRef              = useRef();
  const P = tab === "buy" ? B : S;
  const p3 = Math.max(0, 100 - p1 - p2);

  // Propagate names from purchase items to sell items automatically if not manually edited
  useEffect(() => {
    setSellItems((prev) => {
      // copy array to avoid mutating state directly
      const updated = prev.map((s, idx) => {
        if (items[idx] && !s.manual) {
          return { ...s, name: items[idx].name };
        }
        return s;
      });
      return updated;
    });
  }, [items]);

  /* ── buy calc ── */
  const calc = useMemo(() => {
    const cashCost = items.filter(i=>i.payType==="cash").reduce((s,i)=>s+i.price*i.qty,0);
    const usnCost  = items.filter(i=>i.payType==="usn" ).reduce((s,i)=>s+i.price*i.qty,0);
    const vatCost  = items.filter(i=>i.payType==="vat" ).reduce((s,i)=>s+i.price*i.qty,0);
    const totalCost = cashCost + usnCost + vatCost;

    const budgetExVAT   = sellItems.reduce((s,i)=>s+i.sellPrice*i.qty,0);
    const akkAmt        = budgetExVAT * akkPct / 100;
    const budgetPlusAkk = budgetExVAT + akkAmt;
    const budgetWithVAT = budgetPlusAkk * (1 + VAT);

    const vatOut   = budgetPlusAkk * VAT;
    const vatInVat = vatCost / (1+VAT) * VAT;
    const vatInCsh = (cashCost / CASH_K) / (1+VAT) * VAT;
    const vatToPay = Math.max(0, vatOut - vatInVat - vatInCsh);

    const taxBase   = budgetPlusAkk - usnCost - vatCost/(1+VAT) - (cashCost/CASH_K)/(1+VAT);
    const incomeTax = Math.max(0, taxBase * ITAX);
    const profit    = budgetWithVAT - usnCost - vatCost - (cashCost/CASH_K) - vatToPay - incomeTax;
    const cashOut   = profit * CASH_K;
    const margin    = budgetWithVAT > 0 ? profit / budgetWithVAT : 0;
    const creditCost = totalCost * CREDIT_RATE / 12 * creditM;
    const income    = cashOut - creditCost;

    return { cashCost,usnCost,vatCost,totalCost,budgetExVAT,akkAmt,budgetPlusAkk,budgetWithVAT,vatToPay,incomeTax,profit,cashOut,margin,creditCost,income };
  }, [items, sellItems, akkPct, creditM]);

  /* ── item helpers ── */
  const addItem = () => setItems(p=>[...p,{id:uid(),name:"",price:0,qty:1,payType:"vat"}]);
  const delItem = (id) => setItems(p=>p.filter(i=>i.id!==id));
  const upd = (id,f,v) => setItems(p=>p.map(i=>i.id!==id?i:{...i,[f]:f==="name"||f==="payType"?v:(parseFloat(v)||0)}));

  const addSell = () => setSellItems(p=>[...p,{id:uid(),name:"",qty:1,sellPrice:0,payType:"vat", manual:false}]);
  const delSell = (id) => setSellItems(p=>p.filter(i=>i.id!==id));
  const updSell = (id,f,v) => setSellItems(p=>p.map(i=>{
    if(i.id!==id) return i;
    const newVal = f==="name"||f==="payType"?v:(parseFloat(v)||0);
    return {
      ...i,
      [f]: newVal,
      // mark as manual if user edited name manually
      manual: f === "name" ? true : i.manual
    };
  }));

  /* ── csv export ── */
  const exportBuy = () => {
    const hdr = ["Наименование","Цена","Кол-во","Тип оплаты","Итого"];
    const rows = items.map(i=>[i.name,i.price,i.qty,i.payType,i.price*i.qty]);
    dl([hdr,...rows],"закупка.csv");
  };
  const exportSell = () => {
    const hdr = ["Наименование","Кол-во","Цена б/НДС","Итого","Тип оплаты"];
    const rows = sellItems.map(i=>[i.name,i.qty,i.sellPrice,i.sellPrice*i.qty,i.payType]);
    dl([hdr,...rows],"продажа.csv");
  };
  const dl = (data,name) => {
    const csv = "\uFEFF"+data.map(r=>r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download = name; a.click();
  };
  const importBuy = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const lines = ev.target.result.replace(/^\uFEFF/,"").split("\n").filter(Boolean).slice(1);
      setItems(lines.map((l,idx)=>{
        const c=l.split(";");
        return {id:uid()+idx,name:c[0]||"",price:parseFloat(c[1])||0,qty:parseFloat(c[2])||1,payType:["cash","usn","vat"].includes(c[3])?c[3]:"vat"};
      }));
    };
    r.readAsText(f,"UTF-8"); e.target.value="";
  };
  const importSell = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const lines = ev.target.result.replace(/^\uFEFF/,"").split("\n").filter(Boolean).slice(1);
      setSellItems(lines.map((l,idx)=>{
        const c=l.split(";");
        return {id:uid()+idx,name:c[0]||"",qty:parseFloat(c[1])||1,sellPrice:parseFloat(c[2])||0,payType:["cash","usn","vat"].includes(c[4])?c[4]:"vat"};
      }));
    };
    r.readAsText(f,"UTF-8"); e.target.value="";
  };

  /* ── excel export/import ── */
  const exportAll = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    // ----- Buy sheet -----
    const buyRows = [];
    // Header
    buyRows.push(["Наименование","Цена","Кол-во","Тип оплаты","Итого"]);
    // Data rows with formulas for total
    items.forEach((item, idx) => {
      const rowIndex = buyRows.length + 1; // Excel row index (1-indexed)
      buyRows.push([
        item.name,
        item.price,
        item.qty,
        item.payType,
        { t: 'n', f: `B${rowIndex}*C${rowIndex}` }
      ]);
    });
    const wsBuy = XLSX.utils.aoa_to_sheet(buyRows);
    XLSX.utils.book_append_sheet(wb, wsBuy, 'Buy Items');

    // ----- Sell sheet -----
    const sellRows = [];
    sellRows.push(["Наименование","Кол-во","Цена б/НДС","Итого"]);
    sellItems.forEach((item, idx) => {
      const rowIndex = sellRows.length + 1;
      sellRows.push([
        item.name,
        item.qty,
        item.sellPrice,
        { t: 'n', f: `B${rowIndex}*C${rowIndex}` }
      ]);
    });
    const wsSell = XLSX.utils.aoa_to_sheet(sellRows);
    XLSX.utils.book_append_sheet(wb, wsSell, 'Sell Items');

    // ----- Summary sheet -----
    const bStart = 2;
    const bEnd = items.length + 1;
    const sStart = 2;
    const sEnd = sellItems.length + 1;
    const summaryRows = [];
    // Header
    summaryRows.push(["Метрика","Значение","Формула"]);
    // VAT constant (row2)
    summaryRows.push(["VAT", VAT, null]);
    // AKK percentage (row3)
    summaryRows.push(["AKK %", akkPct, null]);
    // Total purchase cost (row4)
    summaryRows.push(["Total Purchase", { f: `SUM('Buy Items'!E${bStart}:E${bEnd})` }, `=SUM('Buy Items'!E${bStart}:E${bEnd})`]);
    // Budget ex VAT (row5)
    summaryRows.push(["Budget Ex VAT", { f: `SUM('Sell Items'!D${sStart}:D${sEnd})` }, `=SUM('Sell Items'!D${sStart}:D${sEnd})`]);
    // Akk amount (row6): B5 * B3 / 100 (Budget ex VAT * AKK % / 100)
    summaryRows.push(["Akk Amount", { f: `B5*B3/100` }, `=B5*B3/100`]);
    // Budget+Akk Ex VAT (row7): B5 + B6
    summaryRows.push(["Budget+AKK Ex VAT", { f: `B5+B6` }, `=B5+B6`]);
    // Budget+Akk Inc VAT (row8): B7*(1+B2)
    summaryRows.push(["Budget+AKK Inc VAT", { f: `B7*(1+B2)` }, `=B7*(1+B2)`]);
    // Credit months (row9)
    summaryRows.push(["Credit Months", creditM, null]);
    // Credit rate (row10)
    summaryRows.push(["Credit Rate", CREDIT_RATE, null]);
    // Credit cost (row11): B4 * B10 / 12 * B9
    summaryRows.push(["Credit Cost", { f: `B4*B10/12*B9` }, `=B4*B10/12*B9`]);
    // Payment1 percentage (row12)
    summaryRows.push(["Payment1 %", p1, null]);
    // Payment2 percentage (row13)
    summaryRows.push(["Payment2 %", p2, null]);
    // Payment3 percentage (row14): 100 - B12 - B13
    summaryRows.push(["Payment3 %", { f: `100-B12-B13` }, `=100-B12-B13`]);
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Write workbook and trigger download
    const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smeta.xlsx';
    a.click();
  };

  const importAll = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      // Parse Buy Items
      const wsBuy = wb.Sheets['Buy Items'];
      if (wsBuy) {
        const arr = XLSX.utils.sheet_to_json(wsBuy, { header: 1, raw: true });
        // Skip header row and empty rows
        const newItems = arr.slice(1).filter(row => row && row.length >= 4 && row[0] !== undefined).map((row, idx) => {
          return {
            id: uid() + idx,
            name: row[0] || "",
            price: parseFloat(row[1]) || 0,
            qty: parseFloat(row[2]) || 1,
            payType: ["cash","usn","vat"].includes(row[3]) ? row[3] : "vat"
          };
        });
        if (newItems.length > 0) setItems(newItems);
      }
      // Parse Sell Items
      const wsSell = wb.Sheets['Sell Items'];
      if (wsSell) {
        const arr = XLSX.utils.sheet_to_json(wsSell, { header: 1, raw: true });
        const newSell = arr.slice(1).filter(row => row && row.length >= 3 && row[0] !== undefined).map((row, idx) => {
          return {
            id: uid() + idx,
            name: row[0] || "",
            qty: parseFloat(row[1]) || 1,
            sellPrice: parseFloat(row[2]) || 0,
            payType: "vat",
            manual: false
          };
        });
        if (newSell.length > 0) setSellItems(newSell);
      }
      // Parse Summary sheet (optional) to update settings
      const wsSum = wb.Sheets['Summary'];
      if (wsSum) {
        // Extract values by cell address (B3 for AKK %, B9 for credit months, B12 and B13 for payments)
        try {
          const akkCell = wsSum['B3'];
          const creditMonthsCell = wsSum['B9'];
          const p1Cell = wsSum['B12'];
          const p2Cell = wsSum['B13'];
          const newAkk = akkCell && akkCell.v != null ? parseFloat(akkCell.v) : akkPct;
          const newCreditM = creditMonthsCell && creditMonthsCell.v != null ? parseFloat(creditMonthsCell.v) : creditM;
          const newP1 = p1Cell && p1Cell.v != null ? parseFloat(p1Cell.v) : p1;
          const newP2 = p2Cell && p2Cell.v != null ? parseFloat(p2Cell.v) : p2;
          if (!isNaN(newAkk)) setAkkPct(newAkk);
          if (!isNaN(newCreditM)) setCreditM(newCreditM);
          if (!isNaN(newP1)) setP1(newP1);
          if (!isNaN(newP2)) setP2(newP2);
        } catch(err) {
          console.error(err);
        }
      }
    };
    reader.readAsArrayBuffer(f);
    e.target.value = "";
  };

  const payColors = {
    buy:  { cash:{c:B.red,bg:B.redLt,bd:B.redMid,label:"Нал"}, usn:{c:B.blue,bg:B.blueLt,bd:B.blueMid,label:"Безнал УСН"}, vat:{c:B.green,bg:B.greenLt,bd:B.greenMid,label:"Безнал НДС"} },
    sell: { cash:{c:S.red,bg:S.redLt,bd:S.redMid,label:"Нал"}, usn:{c:S.blue,bg:S.blueLt,bd:S.blueMid,label:"Безнал УСН"}, vat:{c:S.green,bg:S.greenLt,bd:S.greenMid,label:"Безнал НДС"} },
  };
  const PC = payColors[tab];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${P.bg}}::-webkit-scrollbar-thumb{background:${P.border};border-radius:3px}
    input,select{font-family:'JetBrains Mono',monospace;font-size:12px;padding:7px 10px;border-radius:8px;width:100%;outline:none;transition:all .15s;background:#fff;color:${P.text}}
    input:focus,select:focus{box-shadow:0 0 0 2.5px ${P.accent}44;border-color:${P.accent}!important}
    select option{background:#fff;color:${P.text}}
    .btn{cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;font-size:11px;letter-spacing:.3px;border-radius:8px;transition:all .18s;padding:8px 15px;display:inline-flex;align-items:center;gap:5px;border:none}
    .btn:hover{transform:translateY(-1px);filter:brightness(1.06)}
    .btn:active{transform:none;filter:brightness(.97)}
    input[type=range]{-webkit-appearance:none;height:5px;border:none;border-radius:3px;cursor:pointer;width:100%}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${P.accent};box-shadow:0 1px 6px ${P.accent}66;border:2.5px solid #fff;cursor:pointer;transition:transform .1s}
    input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15)}
    .mono{font-family:'JetBrains Mono',monospace}
    .lbl{font-family:'Nunito',sans-serif;font-size:9.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:${P.muted}}
    .card{background:${P.card};border-radius:14px;padding:22px;border:1px solid ${P.border};box-shadow:0 1px 4px ${P.border}88;transition:background .3s,border .3s}
    .row-in input{border:1px solid ${P.border}}
    .row-in input:focus{border-color:${P.accent}}
    @keyframes rowIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    .row-anim{animation:rowIn .25s ease}
    @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .fi{animation:fi .3s ease}
  `;

  const Lbl = ({t,color}) => <div className="lbl" style={{color:color||P.muted,marginBottom:13}}>{t}</div>;
  const ColH = ({t,align="left"}) => <div style={{fontFamily:"'Nunito',sans-serif",fontSize:9,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",color:P.muted,textAlign:align}}>{t}</div>;
  const MonoCell = ({v,color,align="left",size=12,bold=false}) => (
    <div className="mono" style={{fontSize:size,color:color||P.text,padding:"7px 0",textAlign:align,fontWeight:bold?600:400}}>{v}</div>
  );

  return (
    <div style={{minHeight:"100vh",background:P.bg,fontFamily:"'Nunito',sans-serif",transition:"background .4s"}}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <header style={{background:P.card,borderBottom:`2px solid ${P.border}`,padding:"0 26px",position:"sticky",top:0,zIndex:100,boxShadow:`0 2px 14px ${P.border}99`,transition:"all .3s"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${P.blue},${P.green})`,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .4s",boxShadow:`0 2px 8px ${P.accent}44`}}>
              <span style={{color:"#fff",fontSize:16,fontWeight:900}}>С</span>
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:15,color:P.text,letterSpacing:.5}}>СМЕТА</div>
              <div style={{fontSize:9.5,color:P.muted,fontWeight:700,marginTop:-1,letterSpacing:.3}}>НДС {(VAT*100).toFixed(0)}% · Налог {(ITAX*100).toFixed(0)}% · внутренняя форма</div>
            </div>
          </div>
          <div style={{display:"flex",background:P.bg,borderRadius:10,padding:4,gap:3,transition:"background .3s"}}>
            {[["buy","Закупка"],["sell","Продажа"]].map(([v,l])=> (
              <button key={v} onClick={()=>setTab(v)} className="btn" style={{
                padding:"7px 22px",borderRadius:8,
                background: tab===v ? P.accent : "transparent",
                color: tab===v ? "#fff" : P.muted,
                boxShadow: tab===v ? `0 2px 10px ${P.accent}55` : "none",
                fontWeight: tab===v ? 800 : 600, fontSize:12,
              }}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{maxWidth:1100,margin:"0 auto",padding:"22px 26px",display:"flex",flexDirection:"column",gap:14}}>

        {/* ── Global Export/Import Buttons ── */}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          <button className="btn" onClick={exportAll}
            style={{background:P.blueLt,color:P.blue,border:`1.5px solid ${P.blueMid}`}}>
            Выгрузить Excel
          </button>
          <button className="btn" onClick={()=>allFileRef.current && allFileRef.current.click()}
            style={{background:P.greenLt,color:P.green,border:`1.5px solid ${P.greenMid}`}}>
            Загрузить Excel
          </button>
          <input ref={allFileRef} type="file" accept=".xlsx,.xls" onChange={importAll} style={{display:"none"}}/>
        </div>

        {/* ═══════════════════ ЗАКУПКА ═══════════════════ */}
        {tab==="buy" && <>

          {/* ── 4 метрики ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
            {[
              {l:"Нал",          v:fmt(calc.cashCost), c:B.red,   bg:B.redLt,   bd:B.redMid},
              {l:"Безнал УСН",   v:fmt(calc.usnCost),  c:B.blue,  bg:B.blueLt,  bd:B.blueMid},
              {l:"Безнал с НДС", v:fmt(calc.vatCost),  c:B.green, bg:B.greenLt, bd:B.greenMid},
              {l:"Итого закупка",v:fmt(calc.totalCost),c:B.blueDk,bg:"#dbeafe", bd:B.blue,    bold:true},
            ].map((m,i)=>(
              <div key={i} className="fi" style={{background:m.bg,border:`1.5px solid ${m.bd}`,borderRadius:12,padding:"15px 18px",animationDelay:`${i*0.05}s`}}>
                <div className="lbl" style={{color:m.c,marginBottom:6}}>{m.l}</div>
                <div className="mono" style={{fontSize:20,fontWeight:m.bold?700:600,color:m.c,letterSpacing:-.5}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* ── Таблица + кнопки ── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <Lbl t="Позиции закупки"/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button className="btn" onClick={exportBuy}
                  style={{background:B.blueLt,color:B.blue,border:`1.5px solid ${B.blueMid}`}}>
                  Выгрузить .csv
                </button>
                <button className="btn" onClick={()=>fileRef.current.click()}
                  style={{background:B.greenLt,color:B.green,border:`1.5px solid ${B.greenMid}`}}>
                  Загрузить .csv
                </button>
                <input ref={fileRef} type="file" accept=".csv" onChange={importBuy} style={{display:"none"}}/>
              </div>
            </div>

            {/* col headers */}
            <div style={{display:"grid",gridTemplateColumns:"2.5fr 110px 80px 150px 120px 36px",gap:7,paddingBottom:8,borderBottom:`1.5px solid ${B.border}`,marginBottom:6}}>
              {[ ["Наименование"],["Цена за 1 шт","right"],["Кол-во","center"],["Тип оплаты"],["Итого","right"],[""]].map(([t,a],i)=><ColH key={i} t={t||""} align={a}/>) }
            </div>

            {/* rows */}
            {items.map((item,idx)=>{
              const pt = payColors.buy[item.payType];
              return (
                <div key={item.id} className="row-in row-anim" style={{display:"grid",gridTemplateColumns:"2.5fr 110px 80px 150px 120px 36px",gap:7,marginBottom:5,paddingBottom:5,borderBottom:idx<items.length-1?`1px dashed ${B.border}00`:""}} >
                  <input value={item.name} placeholder="Наименование" onChange={e=>upd(item.id,"name",e.target.value)}
                    style={{border:`1px solid ${B.border}`}}/>
                  <input type="number" value={item.price||""} placeholder="0" onChange={e=>upd(item.id,"price",e.target.value)}
                    style={{border:`1px solid ${B.border}`,color:B.blueDk,textAlign:"right"}}/>
                  <input type="number" value={item.qty||""} placeholder="1" onChange={e=>upd(item.id,"qty",e.target.value)}
                    style={{border:`1px solid ${B.border}`,textAlign:"center"}}/>
                  <select value={item.payType} onChange={e=>upd(item.id,"payType",e.target.value)}
                    style={{border:`1.5px solid ${pt.bd}`,color:pt.c,background:pt.bg,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
                    <option value="cash">Нал</option>
                    <option value="usn">Безнал УСН</option>
                    <option value="vat">Безнал НДС</option>
                  </select>
                  <div className="mono" style={{fontSize:12,color:B.green,padding:"7px 0",fontWeight:600,textAlign:"right"}}>
                    {fmt(item.price*item.qty)}
                  </div>
                  <button onClick={()=>delItem(item.id)} className="btn"
                    style={{background:B.redLt,color:B.red,border:`1px solid ${B.redMid}`,padding:"7px",justifyContent:"center",fontSize:13}}>✕</button>
                </div>
              );
            })}

            {/* add row */}
            <div style={{paddingTop:10,borderTop:`1px dashed ${B.border}`}}>
              <button onClick={addItem} className="btn"
                style={{background:B.blueLt,color:B.blue,border:`1.5px dashed ${B.blueMid}`,fontSize:12,padding:"9px 18px"}}>
                + Добавить позицию
              </button>
            </div>
          </div>

          {/* ── Сводка + Кредитование ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

            {/* Сводка */}
            <div className="card">
              <Lbl t="Сводка по типам оплаты"/>
              {[
                {key:"cash",label:"Нал",        amt:calc.cashCost, c:B.red,   bg:B.redLt,   bd:B.redMid},
                {key:"usn", label:"Безнал УСН", amt:calc.usnCost,  c:B.blue,  bg:B.blueLt,  bd:B.blueMid},
                {key:"vat", label:"Безнал НДС", amt:calc.vatCost,  c:B.green, bg:B.greenLt, bd:B.greenMid},
              ].map(row=>{
                const share = calc.totalCost>0 ? row.amt/calc.totalCost : 0;
                const count = items.filter(i=>i.payType===row.key).length;
                return (
                  <div key={row.key} style={{marginBottom:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:10,height:10,borderRadius:3,background:row.c}}/>
                        <span style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,color:P.text}}>{row.label}</span>
                        <span style={{fontFamily:"'Nunito',sans-serif",fontWeight:600,fontSize:10,color:P.muted,background:row.bg,border:`1px solid ${row.bd}`,borderRadius:20,padding:"1px 7px"}}>{count} поз.</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div className="mono" style={{fontSize:13,color:row.c,fontWeight:600}}>{fmt(row.amt)}</div>
                        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:P.muted}}>{fmtp(share)}</div>
                      </div>
                    </div>
                    <div style={{height:8,background:B.bg,borderRadius:4,overflow:"hidden",border:`1px solid ${B.border}`}}>
                      <div style={{height:"100%",width:`${share*100}%`,background:`linear-gradient(90deg,${row.c}cc,${row.c})`,borderRadius:4,transition:"width .5s cubic-bezier(.4,0,.2,1)"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{paddingTop:12,borderTop:`1px solid ${B.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,color:B.blueDk}}>Итого закупка</span>
                <span className="mono" style={{fontSize:15,fontWeight:700,color:B.blue}}>{fmt(calc.totalCost)}</span>
              </div>
            </div>

            {/* Кредитование */}
            <div className="card">
              <Lbl t="Кредитование"/>

              {/* slider block */}
              <div style={{background:B.blueLt,border:`1px solid ${B.blueMid}`,borderRadius:11,padding:18,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
                  <div>
                    <div className="lbl" style={{color:B.blue,marginBottom:4}}>Срок финансирования</div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:B.muted}}>Ставка 25% годовых</div>
                  </div>
                  <div className="mono" style={{fontSize:32,fontWeight:700,color:B.blue,lineHeight:1}}>{creditM} <span style={{fontSize:14,color:B.muted,fontWeight:400}}>мес</span></div>
                </div>
                <input type="range" min={1} max={12} value={creditM} onChange={e=>setCreditM(+e.target.value)}
                  style={{background:`linear-gradient(to right,${B.blue} ${(creditM-1)/11*100}%,#bfdbfe ${(creditM-1)/11*100}%)`}}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>(
                    <div key={m} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{width:4,height:4,borderRadius:"50%",background:creditM>=m?B.blue:"#bfdbfe",transition:"background .2s"}}/>
                      <span style={{fontFamily:"'Nunito',sans-serif",fontSize:8,color:creditM===m?B.blue:B.muted,fontWeight:creditM===m?900:400}}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* result cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{padding:"14px 16px",background:B.redLt,border:`1.5px solid ${B.redMid}`,borderRadius:10}}>
                  <div className="lbl" style={{color:B.red,marginBottom:6}}>Стоимость денег</div>
                  <div className="mono" style={{fontSize:18,fontWeight:700,color:B.red}}>{fmt(calc.creditCost)}</div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:B.muted,marginTop:4,lineHeight:1.5}}>
                    {fmt(calc.totalCost)} × 25%<br/>÷ 12 × {creditM} мес
                  </div>
                </div>
                <div style={{padding:"14px 16px",background:B.greenLt,border:`1.5px solid ${B.greenMid}`,borderRadius:10}}>
                  <div className="lbl" style={{color:B.green,marginBottom:6}}>База закупки</div>
                  <div className="mono" style={{fontSize:18,fontWeight:700,color:B.green}}>{fmt(calc.totalCost)}</div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:B.muted,marginTop:4,lineHeight:1.5}}>
                    {items.length} позиц. · {items.reduce((s,i)=>s+i.qty,0)} ед.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>}

        {/* ═══════════════════ ПРОДАЖА ═══════════════════ */}
        {tab==="sell" && <>

          {/* ── 4 метрики ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
            {[
              {l:"Бюджет клиента с НДС", v:fmt(calc.budgetWithVAT), c:S.blueDk, bg:S.blueLt,  bd:S.blueMid},
              {l:"Чистая маржа",         v:fmtp(calc.margin),       c:calc.margin>0.2?S.green:S.red, bg:calc.margin>0.2?S.greenLt:S.redLt, bd:calc.margin>0.2?S.greenMid:S.redMid},
              {l:"Прибыль компании",     v:fmt(calc.profit),        c:S.green,  bg:S.greenLt, bd:S.greenMid, bold:true},
              {l:"КЭШ на руки",          v:fmt(calc.cashOut),       c:S.blueDk, bg:S.blueLt,  bd:S.blue},
            ].map((m,i)=>(
              <div key={i} className="fi" style={{background:m.bg,border:`1.5px solid ${m.bd}`,borderRadius:12,padding:"15px 18px",animationDelay:`${i*0.05}s`}}>
                <div className="lbl" style={{color:m.c,marginBottom:6}}>{m.l}</div>
                <div className="mono" style={{fontSize:20,fontWeight:m.bold?700:600,color:m.c,letterSpacing:-.5}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* ── Таблица продажи ── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <Lbl t="Позиции продажи"/>
              <div style={{display:"flex",gap:8}}>
                <button className="btn" onClick={exportSell}
                  style={{background:S.blueLt,color:S.blue,border:`1.5px solid ${S.blueMid}`}}>Выгрузить .csv</button>
                <button className="btn" onClick={()=>sellFileRef.current.click()}
                  style={{background:S.greenLt,color:S.green,border:`1.5px solid ${S.greenMid}`}}>Загрузить .csv</button>
                <input ref={sellFileRef} type="file" accept=".csv" onChange={importSell} style={{display:"none"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2.5fr 80px 130px 120px 100px",gap:7,paddingBottom:8,borderBottom:`1.5px solid ${S.border}`,marginBottom:6}}>
              {[ ["Наименование"],["Кол-во","center"],["Цена б/НДС","right"],["Итого б/НДС","right"],["Наценка","center"]].map(([t,a],i)=><ColH key={i} t={t} align={a}/>) }
            </div>
            {sellItems.map((item,idx)=>{
              const buyItem = items.find(i=>i.name===item.name);
              const buyP = buyItem ? buyItem.price/(1+VAT) : null;
              const mk = buyP&&buyP>0 ? (item.sellPrice/buyP-1)*100 : null;
              return (
                <div key={item.id} style={{display:"grid",gridTemplateColumns:"2.5fr 80px 130px 120px 100px",gap:7,marginBottom:5,paddingBottom:5,borderBottom:idx<sellItems.length-1?`1px dashed ${S.border}`:"none"}}>
                  <input value={item.name} placeholder="Наименование" onChange={e=>updSell(item.id,"name",e.target.value)}
                    style={{border:`1px solid ${S.border}`}}/>
                  <input type="number" value={item.qty||""} placeholder="1" onChange={e=>updSell(item.id,"qty",e.target.value)}
                    style={{border:`1px solid ${S.border}`,textAlign:"center"}}/>
                  <input type="number" value={item.sellPrice||""} placeholder="0" onChange={e=>updSell(item.id,"sellPrice",e.target.value)}
                    style={{border:`1.5px solid ${S.greenMid}`,color:S.greenDk,background:S.greenLt,textAlign:"right"}}/>
                  <div className="mono" style={{fontSize:13,color:S.green,padding:"7px 0",fontWeight:600,textAlign:"right"}}>{fmt(item.sellPrice*item.qty)}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {mk!==null ? (
                      <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,background:mk>=0?S.greenLt:S.redLt,border:`1px solid ${mk>=0?S.greenMid:S.redMid}`,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,color:mk>=0?S.green:S.red}}>
                        {mk>=0?"+":""}{Math.round(mk)}%
                      </span>
                    ) : <span style={{color:S.muted,fontSize:11}}>—</span>}
                  </div>
                </div>
              );
            })}
            <div style={{paddingTop:10,borderTop:`1px dashed ${S.border}`}}>
              <button onClick={addSell} className="btn"
                style={{background:S.greenLt,color:S.green,border:`1.5px dashed ${S.greenMid}`,fontSize:12,padding:"9px 18px"}}>
                + Добавить позицию
              </button>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* Budget */}
            <div className="card">
              <Lbl t="Формирование бюджета"/>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:18}}>
                {[
                  {l:"Позиции б/НДС",            v:fmt(calc.budgetExVAT),    vc:S.muted,    bg:"transparent",       bd:"transparent"},
                  {l:`АКК агентства ${akkPct}%`,  v:`+ ${fmt(calc.akkAmt)}`, vc:S.blue,     bg:S.blueLt,            bd:S.blueMid},
                  {l:"Бюджет + АКК б/НДС",        v:fmt(calc.budgetPlusAkk), vc:S.text,     bg:"transparent",       bd:"transparent"},
                  {l:"Общий бюджет с НДС", v:fmt(calc.budgetWithVAT), vc:S.greenDk, bg:S.greenLt, bd:S.greenMid, bold:true},
                ].map((row,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 13px",borderRadius:9,background:row.bg,border:`1px solid ${row.bd}`}}>
                    <div style={{fontWeight:row.bold?800:600,fontSize:12,color:row.bold?S.greenDk:S.muted}}>{row.l}</div>
                    <div className="mono" style={{fontSize:row.bold?15:13,color:row.vc,fontWeight:row.bold?700:400}}>{row.v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:S.blueLt,border:`1px solid ${S.blueMid}`,borderRadius:11,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
                  <div className="lbl" style={{color:S.blue}}>АКК агентства</div>
                  <div className="mono" style={{fontSize:28,fontWeight:700,color:S.blue,lineHeight:1}}>{akkPct}<span style={{fontSize:14,color:S.muted,fontWeight:400}}>%</span></div>
                </div>
                <input type="range" min={5} max={30} step={1} value={akkPct} onChange={e=>setAkkPct(+e.target.value)}
                  style={{background:`linear-gradient(to right,${S.blue} ${(akkPct-5)/25*100}%,#c7d2fe ${(akkPct-5)/25*100}%)`}}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                  {[5,10,15,20,25,30].map(v=>(
                    <span key={v} style={{fontFamily:"'Nunito',sans-serif",fontSize:9,color:akkPct>=v?S.blue:S.muted,fontWeight:akkPct===v?900:400}}>{v}%</span>
                  ))}
                </div>
              </div>
            </div>

            {/* P&L */}
            <div className="card">
              <Lbl t="Финансовый результат"/>
              <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:16}}>
                {[
                  {l:`НДС к уплате (${(VAT*100).toFixed(0)}%)`,       v:fmt(calc.vatToPay),   c:S.red,   dir:"▼"},
                  {l:`Налог на прибыль (${(ITAX*100).toFixed(0)}%)`,  v:fmt(calc.incomeTax),  c:S.red,   dir:"▼"},
                  {l:"Прибыль компании",                              v:fmt(calc.profit),     c:S.green, dir:"▲"},
                  {l:"Реальных денег",                              v:fmt(calc.cashOut),    c:S.blue,  dir:""},
                  {l:`Кредитование ${creditM} мес.`,                  v:fmt(calc.creditCost), c:S.red,   dir:"▼"},
                  {l:"Доход итого",                                   v:fmt(calc.income),     c:S.green, dir:"▲", bold:true},
                ].map((row,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",borderRadius:8,background:row.bold?S.greenLt:"transparent",border:row.bold?`1.5px solid ${S.greenMid}`:"1px solid transparent",marginTop:row.bold?4:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {row.dir && <span style={{color:row.c,fontSize:9,fontWeight:900}}>{row.dir}</span>}
                      <span style={{fontWeight:row.bold?800:600,fontSize:11,color:row.bold?S.greenDk:S.muted}}>{row.l}</span>
                    </div>
                    <div className="mono" style={{fontSize:row.bold?14:12,color:row.c,fontWeight:row.bold?700:400}}>{row.v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:S.redLt,border:`1px solid ${S.redMid}`,borderRadius:11,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
                  <div className="lbl" style={{color:S.red}}>Срок кредитования</div>
                  <div className="mono" style={{fontSize:24,fontWeight:700,color:S.red,lineHeight:1}}>{creditM} <span style={{fontSize:12,color:S.muted,fontWeight:400}}>мес</span></div>
                </div>
                <input type="range" min={1} max={12} value={creditM} onChange={e=>setCreditM(+e.target.value)}
                  style={{background:`linear-gradient(to right,${S.red} ${(creditM-1)/11*100}%,#fecdd3 ${(creditM-1)/11*100}%)`}}/>
              </div>
            </div>
          </div>

          {/* Payment schedule */}
          <div className="card">
            <Lbl t="График платежей от клиента"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                {l:"Предоплата", p:p1, set:setP1, max:Math.min(100,100-p2), c:S.blue,  bg:S.blueLt,  bd:S.blueMid,  amt:calc.budgetWithVAT*p1/100, editable:true},
                {l:"Доплата",    p:p2, set:setP2, max:Math.min(100,100-p1), c:S.green, bg:S.greenLt, bd:S.greenMid, amt:calc.budgetWithVAT*p2/100, editable:true},
                {l:"Постоплата", p:p3, set:null,  max:100,                  c:S.red,   bg:S.redLt,   bd:S.redMid,   amt:calc.budgetWithVAT*p3/100, editable:false},
              ].map((pp,i)=>(
                <div key={i} style={{background:pp.bg,border:`1.5px solid ${pp.bd}`,borderRadius:12,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontWeight:800,fontSize:12,color:pp.c}}>{pp.l}</span>
                    <span className="mono" style={{fontSize:26,fontWeight:700,color:pp.c,lineHeight:1}}>{pp.p}<span style={{fontSize:13,fontWeight:400,color:S.muted}}>%</span></span>
                  </div>
                  <div className="mono" style={{fontSize:16,fontWeight:600,color:pp.c,marginBottom:12}}>{fmt(pp.amt)}</div>
                  {pp.editable ? (
                    <>
                      <input type="range" min={0} max={pp.max} value={pp.p} onChange={e=>pp.set(+e.target.value)}
                        style={{background:`linear-gradient(to right,${pp.c} ${pp.p/pp.max*100}%,white ${pp.p/pp.max*100}%)`}}/>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:9,color:pp.c,marginTop:4,textAlign:"right",opacity:.7}}>
                        макс. {pp.max}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{height:6,background:"rgba(255,255,255,.7)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(100,pp.p)}%`,background:pp.c,borderRadius:3,transition:"width .4s ease"}}/>
                      </div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:9,color:pp.c,marginTop:4,textAlign:"right",opacity:.7}}>
                        авто = 100% − {p1}% − {p2}%
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {p3 < 0 && (
              <div style={{marginTop:10,padding:"9px 14px",background:S.redLt,border:`1px solid ${S.redMid}`,borderRadius:9,fontFamily:"'Nunito',sans-serif",fontSize:11,color:S.redDk,fontWeight:700}}>
                Сумма превышает 100% — уменьши предоплату или доплату
              </div>
            )}
          </div>
        </>}
      </main>
    </div>
  );
}