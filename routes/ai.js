const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────────────────────
// ALL 49 FORMS with comprehensive natural language patterns
// ─────────────────────────────────────────────────────────────────────────────
const FORMS = [
  // STUDENT LEAVE
  { form:"Leave Application", portal:"student", keys:["leave","absent","going home","personal work","family function","not coming","skip class","miss class","out of station","native place","marriage at home","relative function","few days off","take leave","need leave","want leave","going for function","sister marriage","brother marriage","home visit"] },
  { form:"Medical Leave Certificate", portal:"student", keys:["sick","fever","ill","unwell","not well","hospital","doctor","medicine","health issue","bed rest","medical reason","surgery","operation","injury","accident","fracture","dengue","typhoid","viral","covid","flu","treatment","admitted"] },
  { form:"On Duty (OD) Request", portal:"student", keys:["od","on duty","representing college","competition outside","hackathon","coding contest","quiz competition","debate","paper presentation outside","symposium","sports event outside","national level","state level","event outside","official college event","technical fest"] },

  // STUDENT CERTIFICATES
  { form:"Bonafide Certificate", portal:"student", keys:["bonafide","bona fide","proof of studying","bank account","bank loan","education loan","passport","visa","scholarship proof","railway concession","enrolled","studying certificate","college proof","proof that i study","certificate studying here","admission proof"] },
  { form:"Transfer Certificate", portal:"student", keys:["tc","transfer certificate","leaving college","change college","discontinue","drop out","migration","moving to another college","college leaving certificate","stop studying here","withdrawal"] },
  { form:"Character Certificate", portal:"student", keys:["character certificate","good conduct","conduct certificate","behavior certificate","police verification","government job certificate","character proof"] },
  { form:"ID Card Replacement", portal:"student", keys:["id card lost","lost id","id card damaged","new id card","replace id","id replacement","college id lost","duplicate id card"] },
  { form:"Bus Pass Application", portal:"student", keys:["bus pass","college bus","transport pass","bus facility","bus route","bus card","bus concession","college transport pass"] },
  { form:"Scholarship Application", portal:"student", keys:["scholarship","financial help","fee waiver","financial assistance","cannot afford fee","economically weak","merit scholarship","government scholarship","bpl","fee concession","stipend"] },

  // STUDENT FEE
  { form:"Fee Payment Request", portal:"student", keys:["fee payment","pay fee later","fee extension","fee installment","fee due","pending fee","unable to pay fee","fee problem","financial difficulty","late fee","fee postpone"] },
  { form:"Course Registration", portal:"student", keys:["course registration","register subject","elective subject","choose elective","register elective","subject enrollment","open elective","professional elective","semester registration"] },

  // STUDENT PLACEMENT
  { form:"Internship Permission Form", portal:"student", keys:["internship permission","doing internship","join internship","internship offer","got internship","joining internship","intern at company","summer internship","winter internship","permission for internship","internship accepted","it company internship","company internship"] },
  { form:"Internship NOC Letter", portal:"student", keys:["noc","no objection certificate","internship noc","company asking noc","noc letter","noc from college","need noc","no objection letter","company needs noc"] },
  { form:"Placement Registration", portal:"student", keys:["placement","campus placement","register placement","job drive","company visiting campus","recruitment","campus recruitment","placement registration","want job","final year placement","placement cell","company coming"] },
  { form:"Industrial Visit Form", portal:"student", keys:["industrial visit","industry visit","plant visit","factory visit","company visit","industrial tour","field trip","site visit","industrial trip","company tour"] },

  // STUDENT HOSTEL
  { form:"Hostel Admission Form", portal:"student", keys:["hostel admission","want hostel","need hostel","hostel room","room allotment","stay in hostel","hostel facility","apply hostel","accommodation","live in hostel","stay in campus","hostel joining"] },
  { form:"Hostel Leave Request", portal:"student", keys:["hostel leave","leave from hostel","go home from hostel","weekend leave hostel","hostel outing","night out hostel","hostel exit","hostel outpass","hostel gate pass","going home from hostel"] },

  // STUDENT ACTIVITY
  { form:"Event Participation Form", portal:"student", keys:["event participation","participate event","cultural event","annual day","college fest","sports event","sports meet","cultural programme","dance event","music event","drama","youth festival","tech event","participate competition"] },
  { form:"Workshop Registration", portal:"student", keys:["workshop","seminar","training program","attend workshop","technical workshop","coding workshop","skill development","expert talk","guest lecture registration","attend seminar"] },
  { form:"Club Activity Form", portal:"student", keys:["club activity","join club","nss","ncc","sports club","cultural club","technical club","coding club","robotics club","literary club","rotaract","extracurricular","club registration","student club"] },
  { form:"Research Lab Access", portal:"student", keys:["research lab","lab access","use research lab","research facility","lab permission","project lab","use equipment lab","permission for lab","advanced lab"] },

  // STUDENT LIBRARY
  { form:"Library Membership Form", portal:"student", keys:["library membership","library card","library access","join library","library registration","get library card","borrow books","use library","library enrollment"] },
  { form:"Book Issue Request", portal:"student", keys:["book issue","borrow book","take book","issue book","book renewal","renew book","extend book","library book","textbook issue","get book from library"] },

  // STUDENT EXAM
  { form:"Exam Registration", portal:"student", keys:["exam registration","register exam","appear exam","semester exam","end semester","university exam","fill exam form","examination registration"] },
  { form:"Revaluation Request", portal:"student", keys:["revaluation","recheck","answer sheet recheck","marks wrong","wrong marks","marks not correct","want revaluation","check my paper again","not satisfied marks","re-evaluate","marks seem wrong","expected more marks"] },
  { form:"Supplementary Exam Application", portal:"student", keys:["supplementary","arrear","backlog","back paper","failed exam","failed subject","re-exam","repeat exam","clear backlog","clear arrear","want to clear arrear","write supplementary","failed in subject"] },
  { form:"Mark Correction Request", portal:"student", keys:["mark correction","wrong grade","incorrect marks","grade error","marks not updated","marks not showing","grade wrong","marks entered wrong","data entry error marks","correct my marks","marks not reflected"] },
  { form:"Hall Ticket Issue Request", portal:"student", keys:["hall ticket","admit card","hall ticket not available","cannot download hall ticket","hall ticket issue","hall ticket problem","hall ticket not generated","need hall ticket"] },
  { form:"Duplicate Mark Memo Request", portal:"student", keys:["duplicate memo","lost memo","mark memo lost","marks statement lost","original memo lost","memo damaged","marks certificate lost","duplicate marks","marks sheet lost"] },
  { form:"Transcript Request", portal:"student", keys:["transcript","academic transcript","higher studies","ms abroad","study abroad","gre","toefl","ielts","foreign university","apply abroad","official transcript","need transcript","apply ms","study in usa","study in uk"] },
  { form:"Consolidated Marks Memo", portal:"student", keys:["consolidated marks","complete marks","all semester marks","full marks statement","overall marks","all year marks","marks of all semesters","consolidated memo"] },
  { form:"Degree Certificate Request", portal:"student", keys:["degree certificate","original degree","provisional certificate","degree completion","pass out","graduated","course completed","final certificate","want my degree","get degree certificate","i finished my course","4 years completed"] },

  // NOTE: Each form's own name is also matched directly via exactMatch in smartMatch
  // FACULTY LEAVE
  { form:"Casual Leave Application", portal:"faculty", keys:["casual leave","faculty leave","staff leave","personal leave faculty","day off faculty","not coming faculty","leave faculty","absent faculty","family function faculty","going out faculty"] },
  { form:"Medical Leave Application", portal:"faculty", keys:["sick faculty","fever faculty","ill faculty","unwell faculty","hospital faculty","medical faculty","health issue faculty","doctor visit faculty","medical leave faculty","health problem staff"] },
  { form:"On Duty Request", portal:"faculty", keys:["od faculty","on duty faculty","official work faculty","representing faculty","conference faculty","seminar faculty","workshop outside faculty","official duty faculty","exam duty","invigilation duty","external duty","board work","university work"] },

  // FACULTY ACADEMIC
  { form:"Internal Marks Submission", portal:"faculty", keys:["internal marks","submit marks","upload marks","marks submission","cia marks","continuous assessment","internal assessment","mid semester marks","unit test marks","assignment marks","marks entry","grade submission"] },
  { form:"Attendance Submission", portal:"faculty", keys:["attendance submission","submit attendance","upload attendance","attendance entry","class attendance","attendance register","monthly attendance","student attendance submit"] },
  { form:"Course Plan Upload", portal:"faculty", keys:["course plan","lesson plan","teaching plan","syllabus plan","course outline","upload course plan","submit course plan","unit plan","teaching schedule"] },
  { form:"Project Evaluation Form", portal:"faculty", keys:["project evaluation","evaluate project","project marks","project review","student project","project guide","evaluate student project","project viva","mini project","final year project evaluation"] },
  { form:"Guest Lecture Arrangement", portal:"faculty", keys:["guest lecture","expert lecture","industry expert","invite expert","guest speaker","arrange lecture","expert talk","industry person lecture","resource person"] },

  // FACULTY RESEARCH & ADMIN
  { form:"Research Proposal Submission", portal:"faculty", keys:["research proposal","research project","research grant","research funding","phd research","funded project","sponsored research","research collaboration"] },
  { form:"Equipment Request Form", portal:"faculty", keys:["equipment request","new laptop","new computer","projector","lab equipment","device request","buy equipment","need equipment","hardware request","instrument request","equipment purchase"] },
  { form:"Lab Resource Request", portal:"faculty", keys:["lab resource","lab material","lab consumables","chemicals","lab supplies","request lab material","lab requirement","lab budget","lab items","laboratory resource"] },
  { form:"Travel Allowance Claim", portal:"faculty", keys:["travel allowance","ta claim","travel reimbursement","travel expense","journey expense","travel bill","conveyance","travel cost","reimburse travel","daily allowance","tour allowance","official travel claim"] },
  { form:"Reimbursement Form", portal:"faculty", keys:["reimbursement","reimburse","claim money","expense claim","paid from pocket","spent own money","claim expenses","official expense","registration fee reimbursement","expense refund"] },
  { form:"Workshop/FDP Permission", portal:"faculty", keys:["fdp","faculty development","workshop permission","training permission","attend fdp","faculty training","development program","attend workshop faculty","professional development","faculty workshop","learning program","training leave"] },
  { form:"Conference Participation", portal:"faculty", keys:["conference","paper presentation","research conference","present paper","international conference","national conference","ieee conference","academic conference","conference paper","publication conference"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT FORM-FILL DETAILS from text
// ─────────────────────────────────────────────────────────────────────────────
function extractDetails(text) {
  const data = {};
  const t    = text.toLowerCase();

  // Months map
  const months = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const toDate = (d,m,y) => `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y||new Date().getFullYear()}`;

  // Date range: "from 10th April to 15th April"
  const rangePat = /from\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?\s+to\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?/i;
  const rm = text.match(rangePat);
  if (rm) {
    const m1 = months[rm[2].toLowerCase()], m2 = months[rm[5].toLowerCase()];
    if (m1) data["From Date"] = toDate(rm[1],m1,rm[3]);
    if (m2) data["To Date"]   = toDate(rm[4],m2,rm[6]||rm[3]);
  }

  // Same month range: "10th to 15th April"
  if (!data["From Date"]) {
    const sm = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+to\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?/i);
    if (sm) {
      const mon = months[sm[3].toLowerCase()];
      if (mon) { data["From Date"]=toDate(sm[1],mon,sm[4]); data["To Date"]=toDate(sm[2],mon,sm[4]); }
    }
  }

  // Single date
  if (!data["From Date"]) {
    const sd = text.match(/(?:on|from|date)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?/i);
    if (sd) { const mon=months[sd[2].toLowerCase()]; if (mon) data["From Date"]=toDate(sd[1],mon,sd[3]); }
  }

  // Tomorrow
  if (t.includes("tomorrow")) {
    const d=new Date(); d.setDate(d.getDate()+1);
    data["From Date"]=d.toLocaleDateString("en-IN");
  }

  // Reason
  const rps = [/reason\s+is\s+([^.!?,\n]+)/i,/due\s+to\s+([^.!?,\n]+)/i,/because\s+of\s+([^.!?,\n]+)/i,/because\s+([^.!?,\n]+)/i,/for\s+(marriage|medical|sick|fever|function|emergency|exam|hospital|wedding|interview|surgery)[^.!?,]*/i];
  for (const rp of rps) { const m=text.match(rp); if(m&&m[1].trim().length>2){data["Reason"]=m[1].trim();break;} }

  // Duration
  const dm=t.match(/(\d+)\s*(?:day|days)/i);
  if (dm) { const n=parseInt(dm[1]); data["Duration"]=n+" day"+(n>1?"s":""); }

  // Phone
  const pm=text.match(/(\d{10})/)||text.match(/(?:contact|phone|mobile)\s+(\d[\d\s]{8,})/i);
  if (pm) { const d=(pm[1]||pm[2]).replace(/\s/g,"").slice(0,10); if(d.length>=10) data["Contact Number"]=d; }

  // Company
  const cm=text.match(/(?:at|in|with|joining|company)\s+([A-Z][a-zA-Z\s]{2,25}(?:Ltd|Inc|Pvt|Tech|Technologies|Solutions|Systems|Corp)?)\b/);
  if (cm) data["Company Name"]=cm[1].trim();

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART MATCH — score every form, pick highest
// ─────────────────────────────────────────────────────────────────────────────
function smartMatch(text, userRole) {
  const t = text.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();

  // Filter by role
  const candidates = FORMS.filter(f => {
    if (!userRole) return true;
    if (f.portal === "student") return ["student"].includes(userRole);
    if (f.portal === "faculty") return ["faculty","mentor","hod","college_admin","placement_director","college_director"].includes(userRole);
    return true;
  });

  // EXACT form name match first (user typed/said the form name directly)
  const exactMatch = candidates.find(f =>
    t === f.form.toLowerCase() ||
    t.includes(f.form.toLowerCase()) ||
    f.form.toLowerCase().includes(t)
  );
  if (exactMatch) return { form: exactMatch.form, fillData: extractDetails(text) };

  // KEYWORD scoring — natural language
  let best = null, bestScore = 0;
  for (const item of candidates) {
    let score = 0;
    for (const kw of item.keys) {
      if (t.includes(kw.toLowerCase())) {
        score += kw.split(" ").length * 2;
      }
    }
    if (score > bestScore) { bestScore = score; best = item; }
  }
  if (!best || bestScore < 2) return null;
  return { form: best.form, fillData: extractDetails(text) };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTUAL TIPS per form
// ─────────────────────────────────────────────────────────────────────────────
const TIPS = {
  "Medical Leave Certificate":     "Tip: Attach your doctor's prescription as supporting document.",
  "Revaluation Request":           "Tip: Keep your revaluation fee payment receipt ready.",
  "Supplementary Exam Application":"Tip: Attach your exam fee payment receipt.",
  "Internship Permission Form":    "Tip: Attach your internship offer letter from the company.",
  "Internship NOC Letter":         "Tip: Your company needs this signed letter from college.",
  "Bonafide Certificate":          "Tip: Mention the purpose — bank, loan, passport, or scholarship.",
  "Transcript Request":            "Tip: Processing takes 7-10 days. Mention purpose — MS/job/visa.",
  "Degree Certificate Request":    "Tip: Processing takes 15-20 days after course completion.",
  "Scholarship Application":       "Tip: Keep your income certificate and last year's marks ready.",
  "Workshop/FDP Permission":       "Tip: Attach the FDP invitation or brochure.",
  "Conference Participation":      "Tip: Attach the paper acceptance letter.",
  "Travel Allowance Claim":        "Tip: Keep all travel bills and tickets ready.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAT ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
router.post("/chat", protect, (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ message: "messages array required" });

    const userRole = req.user?.role || "student";
    const lastMsg  = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // Direct form name lookup (user typed/said exact form name)
  const directMatch = FORMS.find(f => {
    const tl = lastMsg.toLowerCase().trim();
    return tl === f.form.toLowerCase() ||
           f.form.toLowerCase() === tl ||
           (tl.length > 5 && f.form.toLowerCase().startsWith(tl)) ||
           (tl.length > 5 && tl.startsWith(f.form.toLowerCase().split(" ")[0]+" "+f.form.toLowerCase().split(" ")[1]||""));
  });
  if (directMatch) {
    const fillData = extractDetails(lastMsg);
    const tip = TIPS[directMatch.form] || "";
    return res.json({
      message: `Opening **${directMatch.form}** for you.${tip ? " "+tip : ""} Click below to fill the form.`,
      suggestedForm: directMatch.form,
      fillData: Object.keys(fillData).length > 0 ? fillData : null,
      action: "navigate_to_form",
    });
  }

  const match = smartMatch(lastMsg, userRole);

    if (match) {
      const fillData = match.fillData || {};
      const hasData  = Object.keys(fillData).length > 0;
      const tip      = TIPS[match.form] || "";
      const filledFields = hasData ? Object.keys(fillData).join(", ") : "";

      const message = [
        `I found the right form for you! You need the **${match.form}**.`,
        hasData ? `I've pre-filled: ${filledFields} from your message — please review them.` : "",
        tip,
        "Click below to open the form.",
      ].filter(Boolean).join(" ");

      return res.json({
        message,
        suggestedForm: match.form,
        fillData:      hasData ? fillData : null,
        action:        "navigate_to_form",
      });
    }

    // No match — helpful prompt based on role
    const isFaculty = ["faculty","mentor","hod"].includes(userRole);
    const examples  = isFaculty
      ? `• "I need casual leave tomorrow"\n• "Want to attend FDP on AI next week"\n• "Need travel allowance for official trip"\n• "Presenting paper at IEEE conference"`
      : `• "I have fever and can't come to college"\n• "Got internship offer from Infosys, need permission"\n• "Company is asking for NOC letter"\n• "Failed in DBMS, want to write supplementary"\n• "Not satisfied with marks, want recheck"\n• "Need proof that I study here for bank"\n• "Course completed, need my degree certificate"`;

    res.json({
      message: `I'm here to help you find the right form! Describe your situation naturally.\n\nFor example:\n${examples}\n\nThe more detail you give, the better I can identify the exact form for you!`,
      suggestedForm: null,
      fillData:      null,
      action:        "ask_more",
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;