import { useState, useEffect } from "react";
import { getFormsAPI, submitApplicationAPI } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import PredictiveWidget from "../../components/PredictiveWidget";

const STUDENT_CATEGORIES = ["All","Certificate","Leave","Placement","Fee","Hostel","Exam","Activity","Library"];
const FACULTY_CATEGORIES = ["All","Leave","Academic","Research","Admin","Professional"];

// ── Reusable button — reads --accent from parent wrapper ──────────────────────
const Btn = ({ onClick, children, variant, disabled, accent = "#e85d26" }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding:"9px 20px", borderRadius:10, border:"1.5px solid",
      cursor: disabled ? "not-allowed" : "pointer", fontWeight:700, fontSize:13, transition:"all 0.15s",
      background: disabled ? "#ccc" : variant==="secondary" ? "white" : accent,
      color:      disabled ? "#fff" : variant==="secondary" ? "#4a5568" : "white",
      borderColor:disabled ? "#ccc" : variant==="secondary" ? "#e8e4dc" : accent }}>{children}
  </button>
);

// ── File Uploader ─────────────────────────────────────────────────────────────
function FileUploader({ files, setFiles, accentColor = "#e85d26" }) {
  const [drag, setDrag] = useState(false);
  const addFiles = (list) => {
    const valid = Array.from(list).filter(
      f => ["application/pdf","image/jpeg","image/png"].includes(f.type) && f.size <= 10*1024*1024
    );
    if (valid.length < Array.from(list).length)
      alert("Some files skipped — only PDF, JPG, PNG under 10MB allowed.");
    setFiles(p => [...p, ...valid]);
  };
  return (
    <div>
      <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
        style={{ display:"none" }}
        onChange={e => { addFiles(e.target.files); e.target.value=""; }} />
      <div
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files);}}
        style={{ border:"2px dashed "+(drag?accentColor:files.length?"#059669":"#d0cac0"),
          borderRadius:12, padding:"24px 20px", textAlign:"center",
          background:drag?accentColor+"10":files.length?"#f0fdf4":"#fafaf8", transition:"all 0.2s" }}>
        {files.length === 0 ? (
          <>
            <div style={{fontSize:32,marginBottom:10}}>📎</div>
            <div style={{fontSize:13,color:"#888",marginBottom:12}}>Drag & drop files here</div>
            <label htmlFor="file-input"
              style={{display:"inline-block",background:accentColor,color:"white",
                padding:"8px 20px",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              Browse Files
            </label>
            <div style={{fontSize:11,color:"#aaa",marginTop:8}}>PDF, JPG, PNG — max 10MB each</div>
          </>
        ) : (
          <>
            <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:8}}>
              ✅ {files.length} file{files.length>1?"s":""} ready
            </div>
            {files.map((f,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                background:"white",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 12px",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:500,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                <button type="button" onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                  style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,
                    padding:"1px 7px",fontSize:12,cursor:"pointer",flexShrink:0}}>✕</button>
              </div>
            ))}
            <label htmlFor="file-input"
              style={{display:"inline-block",marginTop:8,fontSize:12,color:accentColor,
                fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>
              + Add more
            </label>
          </>
        )}
      </div>
    </div>
  );
}

// ── Form Wizard ───────────────────────────────────────────────────────────────
function FormWizard({ form, onBack, onNavigate, accentColor = "#e85d26", isFaculty = false }) {
  const { user } = useAuth();

  // ── Profile field mapping — maps form field names to user profile values ──
  const PROFILE_MAP = {
    // Student fields
    "Student Name":           user?.name,
    "Name":                   user?.name,
    "Full Name":              user?.name,
    "Applicant Name":         user?.name,
    "Roll Number":            user?.rollNo,
    "Register Number":        user?.rollNo,
    "Hall Ticket Number":     user?.rollNo,
    "Branch / Department":    user?.dept,
    "Department":             user?.dept,
    "Branch":                 user?.dept,
    "Course":                 user?.dept,
    "Year":                   user?.year,
    "Academic Year":          user?.year,
    "Email":                  user?.email,
    "Email ID":               user?.email,
    "Contact Email":          user?.email,
    // Faculty fields
    "Faculty Name":           user?.name,
    "Employee ID":            user?.rollNo || user?.employeeId,
    "Designation":            user?.designation,
    "Staff Name":             user?.name,
    "Semester":               user?.year?.includes("1st") ? "1" :
                              user?.year?.includes("2nd") ? "3" :
                              user?.year?.includes("3rd") ? "5" :
                              user?.year?.includes("4th") ? "7" : "",
  };

  // Fields that came from auto-fill (to show green highlight)
  const [autoFilledFields, setAutoFilledFields] = useState([]);

  // AI prefill from chat assistant
  const aiPrefill = (() => {
    try {
      const stored = sessionStorage.getItem("ai_prefill");
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      if (parsed.formId === form._id || parsed.formName?.toLowerCase() === form.name?.toLowerCase()) {
        sessionStorage.removeItem("ai_prefill");
        return parsed.prefillData || {};
      }
      return {};
    } catch { return {}; }
  })();

  const [step,        setStep]        = useState(1);
  const [formData,    setFormData]    = useState(aiPrefill);
  const [remarks,     setRemarks]     = useState("");
  const [files,       setFiles]       = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [error,       setError]       = useState("");
  const [aiAssisted,  setAiAssisted]  = useState(Object.keys(aiPrefill).length > 0);
  const [autoFillDone, setAutoFillDone] = useState(false);

  // ── AUTO-FILL FUNCTION ────────────────────────────────────────────────────
  const handleAutoFill = () => {
    const filled   = {};
    const filledKeys = [];
    (form.fields || []).forEach(field => {
      const val = PROFILE_MAP[field];
      if (val && val.trim()) {
        filled[field] = val;
        filledKeys.push(field);
      }
    });
    setFormData(prev => ({ ...prev, ...filled }));
    setAutoFilledFields(filledKeys);
    setAutoFillDone(true);
    // Clear field errors for auto-filled fields
    setFieldErrors(prev => {
      const n = { ...prev };
      filledKeys.forEach(k => delete n[k]);
      return n;
    });
  };

  // Count how many profile fields match this form
  const autoFillCount = (form.fields || []).filter(f => {
    const v = PROFILE_MAP[f];
    return v && v.trim();
  }).length;

  // ── VALIDATION STATE ──────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});
  const [showErrors,  setShowErrors]  = useState(false);

  const requiredFields = form.fields || [];

  const getEmptyFields = () =>
    requiredFields.filter(f => !formData[f] || !formData[f].trim());


  // ── STEP 1 → STEP 2: Validate before proceeding ───────────────────────────
  const handleContinue = () => {
    const empty = getEmptyFields();
    if (empty.length > 0) {
      // Mark which fields have errors
      const errors = {};
      empty.forEach(f => { errors[f] = true; });
      setFieldErrors(errors);
      setShowErrors(true);
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // All good — proceed
    setFieldErrors({});
    setShowErrors(false);
    setStep(2);
  };

  // Clear error on field change
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field] && value.trim()) {
      setFieldErrors(prev => { const n = {...prev}; delete n[field]; return n; });
    }
  };

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const saved = await submitApplicationAPI(form._id, formData, remarks, files);
      setSubmittedId(saved.appId);
    } catch (err) {
      setError(err.message || "Submission failed. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (submittedId) return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        padding:"60px 20px",background:"white",borderRadius:20,boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
        <div style={{fontSize:72,marginBottom:16}}>🎉</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6}}>Application Submitted!</h2>
        <p style={{color:"#8898aa",marginBottom:12,fontSize:14}}>{form.name}</p>
        <div style={{background:accentColor+"15",border:`2px solid ${accentColor}`,borderRadius:12,
          padding:"12px 32px",marginBottom:24}}>
          <span style={{color:accentColor,fontWeight:800,fontSize:22}}>{submittedId}</span>
        </div>
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 20px",
          marginBottom:16,width:"100%",maxWidth:420,textAlign:"left"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#166534",marginBottom:10}}>
            ✅ Saved to database. Approval chain:
          </div>
          {(form.signatories||[]).map((s,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                background:i===0?"#059669":"#e8e4dc",
                color:i===0?"white":"#8898aa",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,fontWeight:700}}>{i+1}</div>
              <span style={{fontSize:13,color:i===0?"#059669":"#8898aa",fontWeight:i===0?700:400}}>
                {s} {i===0?"← Reviewing now":""}
              </span>
            </div>
          ))}
        </div>
        <p style={{fontSize:12,color:"#8898aa",marginBottom:24,textAlign:"center"}}>
          ℹ️ Refresh the page anytime — your data is saved in MongoDB.
        </p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
          <button
            onClick={() => onNavigate("my-applications")}
            style={{padding:"11px 24px",background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,
              color:"white",border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer",
              boxShadow:`0 4px 14px ${accentColor}44`}}>
            {isFaculty ? "View My Requests →" : "View My Applications →"}
          </button>
          <Btn variant="secondary" accent={accentColor} onClick={onBack}>Browse More Forms</Btn>
        </div>
      </div>
    </div>
  );

  const steps = ["Form Details","Review","Submit"];

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,margin:0}}>{form.name}</h1>
          <p style={{color:"#8898aa",fontSize:13,marginTop:4}}>{form.description}</p>
        </div>
        <Btn variant="secondary" accent={accentColor} onClick={onBack}>← Back</Btn>
      </div>

      {/* Step indicator */}
      <div style={{background:"white",borderRadius:14,padding:"14px 20px",marginBottom:20,
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)",display:"flex",alignItems:"center"}}>
        {steps.map((s,i) => (
          <div key={s} style={{display:"flex",alignItems:"center",flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",
                background:step>i+1?"#059669":step===i+1?accentColor:"#e8e4dc",
                color:step>=i+1?"white":"#8898aa",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>
                {step>i+1?"✓":i+1}
              </div>
              <span style={{fontSize:13,fontWeight:step===i+1?600:400,
                color:step>i+1?"#059669":step===i+1?accentColor:"#8898aa"}}>{s}</span>
            </div>
            {i<2&&<div style={{flex:1,height:2,background:step>i+1?"#059669":"#e8e4dc",margin:"0 12px"}}/>}
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20}}>
        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>

          {/* ── STEP 1: Fill form ─────────────────────────────────────── */}
          {step===1 && (
            <div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Fill Application Details</h3>

                {/* ── AUTO-FILL BUTTON ── */}
                {autoFillCount > 0 && !autoFillDone && (
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    style={{
                      display:"flex", alignItems:"center", gap:7,
                      padding:"8px 16px", borderRadius:99,
                      background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,
                      color:"white", border:"none", cursor:"pointer",
                      fontSize:12, fontWeight:800,
                      boxShadow:`0 3px 12px ${accentColor}44`,
                      transition:"all 0.2s",
                    }}
                    onMouseOver={e=>e.currentTarget.style.transform="scale(1.04)"}
                    onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}
                  >
                    ⚡ Auto-Fill ({autoFillCount} fields)
                  </button>
                )}

                {/* Already filled badge */}
                {autoFillDone && (
                  <div style={{display:"flex", alignItems:"center", gap:6,
                    background:"#f0fdf4", border:"1.5px solid #bbf7d0",
                    borderRadius:99, padding:"5px 12px"}}>
                    <span style={{fontSize:13}}>✅</span>
                    <span style={{fontSize:12, fontWeight:700, color:"#059669"}}>
                      {autoFilledFields.length} fields auto-filled
                    </span>
                    <button type="button" onClick={()=>{
                      setAutoFillDone(false);
                      setAutoFilledFields([]);
                      setFormData({});
                    }}
                      style={{background:"none",border:"none",cursor:"pointer",
                        color:"#8898aa",fontSize:11,fontWeight:600,padding:0,
                        marginLeft:4,textDecoration:"underline"}}>
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Auto-fill info banner */}
              {autoFillDone && (
                <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",
                  border:"1.5px solid #86efac", borderRadius:12,
                  padding:"10px 14px", marginBottom:16,
                  display:"flex", alignItems:"flex-start", gap:10}}>
                  <span style={{fontSize:18}}>✅</span>
                  <div>
                    <div style={{fontWeight:800, fontSize:13, color:"#166534", marginBottom:3}}>
                      Profile data auto-filled!
                    </div>
                    <div style={{fontSize:12, color:"#15803d"}}>
                      <strong style={{color:"#059669"}}>{autoFilledFields.join(", ")}</strong> — filled from your profile.
                      {requiredFields.length - autoFilledFields.length > 0
                        ? ` Please fill the remaining ${requiredFields.length - autoFilledFields.length} field(s) manually.`
                        : " All fields are filled — ready to continue!"}
                    </div>
                  </div>
                </div>
              )}

              {/* Global validation banner */}
              {showErrors && Object.keys(fieldErrors).length > 0 && (
                <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:10,
                  padding:"12px 16px",marginBottom:18,display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
                  <div>
                    <div style={{fontWeight:700,color:"#dc2626",fontSize:13,marginBottom:4}}>
                      Please fill in all required fields before continuing.
                    </div>
                    <div style={{fontSize:12,color:"#ef4444"}}>
                      Missing: {Object.keys(fieldErrors).join(", ")}
                    </div>
                  </div>
                </div>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:14}}>
                {requiredFields.map(field => {
                  const hasError     = fieldErrors[field];
                  const isAutoFilled = autoFilledFields.includes(field) && !!formData[field];
                  return (
                    <div key={field}>
                      <label style={{fontSize:11,fontWeight:700,display:"block",marginBottom:5,
                        textTransform:"uppercase",letterSpacing:0.3,
                        color:hasError?"#dc2626":isAutoFilled?"#059669":"#4a5568"}}>
                        {field} <span style={{color:accentColor}}>*</span>
                        {isAutoFilled && (
                          <span style={{marginLeft:8, fontSize:10, fontWeight:700,
                            color:"#059669", background:"#f0fdf4",
                            padding:"1px 7px", borderRadius:99,
                            textTransform:"none", letterSpacing:0}}>
                            ⚡ auto-filled
                          </span>
                        )}
                      </label>
                      <input
                        value={formData[field]||""}
                        onChange={e => handleFieldChange(field, e.target.value)}
                        placeholder={"Enter " + field.toLowerCase()}
                        style={{width:"100%",padding:"10px 12px",boxSizing:"border-box",
                          fontSize:13,borderRadius:8,outline:"none",transition:"border-color 0.15s",
                          border: hasError
                            ? "2px solid #dc2626"
                            : isAutoFilled
                              ? "1.5px solid #059669"
                              : "1.5px solid #e2e8f0",
                          background: hasError    ? "#fef2f2"
                                    : isAutoFilled ? "#f0fdf4"
                                    : "white"}}
                        onFocus={e  => { if(!hasError) e.target.style.borderColor=isAutoFilled?"#059669":accentColor; }}
                        onBlur={e   => { if(!hasError) e.target.style.borderColor=isAutoFilled?"#059669":"#e2e8f0"; }}
                      />
                      {hasError && (
                        <div style={{fontSize:11,color:"#dc2626",marginTop:4,fontWeight:600}}>
                          ⚠ {field} is required
                        </div>
                      )}
                    </div>
                  );
                })}

                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4a5568",display:"block",
                    marginBottom:5,textTransform:"uppercase",letterSpacing:0.3}}>
                    Additional Remarks
                  </label>
                  <textarea value={remarks} onChange={e=>setRemarks(e.target.value)}
                    placeholder="Any additional notes..."
                    style={{width:"100%",minHeight:80,padding:"10px 12px",border:"1.5px solid #e2e8f0",
                      borderRadius:8,fontSize:13,resize:"vertical",outline:"none",
                      boxSizing:"border-box",transition:"border-color 0.15s"}}
                    onFocus={e => e.target.style.borderColor=accentColor}
                    onBlur={e  => e.target.style.borderColor="#e2e8f0"}
                  />
                </div>

                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4a5568",display:"block",
                    marginBottom:6,textTransform:"uppercase",letterSpacing:0.3}}>
                    Supporting Documents (optional)
                  </label>
                  <FileUploader files={files} setFiles={setFiles} accentColor={accentColor}/>
                </div>

                {/* ── Validated continue ── */}
                <button
                  onClick={handleContinue}
                  style={{padding:"11px 24px",background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,color:"white",
                    border:"none",borderRadius:10,fontWeight:700,fontSize:14,
                    cursor:"pointer",alignSelf:"flex-start",
                    boxShadow:`0 4px 14px ${accentColor}44`}}>
                  Continue to Review →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ────────────────────────────────────────── */}
          {step===2 && (
            <div>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Review Your Application</h3>
              <div style={{background:"#f5f2ed",borderRadius:10,padding:16,marginBottom:16}}>
                {requiredFields.map(field => (
                  <div key={field} style={{display:"flex",justifyContent:"space-between",
                    padding:"8px 0",borderBottom:"1px solid #e8e4dc",gap:12}}>
                    <span style={{fontSize:13,color:"#8898aa",flexShrink:0}}>{field}</span>
                    <span style={{fontSize:13,fontWeight:600,textAlign:"right",
                      color: formData[field] ? "#0d1b2a" : "#dc2626"}}>
                      {formData[field] || "⚠ Not filled"}
                    </span>
                  </div>
                ))}
                {remarks && (
                  <div style={{display:"flex",justifyContent:"space-between",
                    padding:"8px 0",borderBottom:"1px solid #e8e4dc",gap:12}}>
                    <span style={{fontSize:13,color:"#8898aa"}}>Remarks</span>
                    <span style={{fontSize:13,fontWeight:600,textAlign:"right",maxWidth:"60%"}}>{remarks}</span>
                  </div>
                )}
                {files.length > 0 && (
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
                    <span style={{fontSize:13,color:"#8898aa"}}>Attachments</span>
                    <span style={{fontSize:13,fontWeight:600,color:"#059669"}}>{files.length} file(s)</span>
                  </div>
                )}
              </div>
              <p style={{fontSize:12,color:"#8898aa",marginBottom:16}}>
                By submitting you confirm all information is accurate.
              </p>
              <div style={{display:"flex",gap:10}}>
                <Btn variant="secondary" accent={accentColor} onClick={()=>setStep(1)}>← Edit</Btn>
                <Btn accent={accentColor} onClick={()=>setStep(3)}>Confirm & Proceed →</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 3: Submit ────────────────────────────────────────── */}
          {step===3 && (
            <div>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Ready to Submit</h3>
              {error && (
                <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,
                  padding:"12px 14px",marginBottom:16,fontSize:13,color:"#dc2626"}}>
                  ❌ {error}
                  <div style={{marginTop:6,fontSize:11}}>
                    Make sure backend is running: <code>npm run dev</code>
                  </div>
                </div>
              )}
              <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",
                borderRadius:10,padding:16,marginBottom:20}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:20}}>✅</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#166534"}}>All checks passed</div>
                    <div style={{fontSize:12,color:"#059669",marginTop:2}}>
                      Form complete · {files.length > 0 ? files.length+" attachment(s)" : "No attachments"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary of what will be submitted */}
              <div style={{background:"#f5f2ed",borderRadius:10,padding:"12px 16px",marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:700,color:"#4a5568",marginBottom:8,textTransform:"uppercase",letterSpacing:0.3}}>
                  Submission Summary
                </div>
                {requiredFields.map(f => (
                  <div key={f} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                    <span style={{color:"#8898aa"}}>{f}</span>
                    <span style={{fontWeight:600}}>{formData[f]}</span>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:10}}>
                <Btn variant="secondary" accent={accentColor} onClick={()=>setStep(2)}>← Back</Btn>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{padding:"11px 24px",
                    background:submitting?"#ccc":"linear-gradient(135deg,#059669,#047857)",
                    color:"white",border:"none",borderRadius:10,fontWeight:700,fontSize:14,
                    cursor:submitting?"not-allowed":"pointer",
                    boxShadow:submitting?"none":"0 4px 14px rgba(5,150,105,0.3)"}}>
                  {submitting ? "⏳ Saving to database..." : "🚀 Submit Application"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"white",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <h4 style={{fontSize:13,fontWeight:700,marginBottom:12}}>Approval Chain</h4>
            {(form.signatories||[]).map((s,i) => (
              <div key={s} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:accentColor+"15",
                  color:accentColor,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:700}}>{i+1}</div>
                <span style={{fontSize:13,fontWeight:600}}>{s}</span>
              </div>
            ))}
          </div>
          {/* AI prefill banner */}
          {aiAssisted && (
            <div style={{background:"linear-gradient(135deg,#eff6ff,#dbeafe)",border:"1.5px solid #93c5fd",borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:0.4,marginBottom:4}}>🤖 AI Pre-filled</div>
              <div style={{fontSize:12,color:"#1e40af",lineHeight:1.5}}>Fields were auto-filled by EduBot. Please review and adjust.</div>
              <button type="button" onClick={()=>setAiAssisted(false)} style={{marginTop:6,background:"none",border:"none",color:"#2563eb",fontSize:11,cursor:"pointer",fontWeight:600,padding:0,textDecoration:"underline"}}>Dismiss</button>
            </div>
          )}

          {/* AI Predictive widget */}
          <PredictiveWidget form={form}/>

          {/* Required fields checklist — live feedback */}
          {step===1 && requiredFields.length > 0 && (
            <div style={{background:"white",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#4a5568",marginBottom:10,textTransform:"uppercase",letterSpacing:0.3}}>
                Required Fields
              </div>
              {requiredFields.map(f => {
                const filled = !!(formData[f] && formData[f].trim());
                return (
                  <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,
                      background:filled?"#059669":"#f5f2ed",
                      border:"2px solid "+(filled?"#059669":"#d0cac0"),
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:10,color:"white",fontWeight:700,transition:"all 0.2s"}}>
                      {filled?"✓":""}
                    </div>
                    <span style={{fontSize:12,color:filled?"#059669":"#8898aa",
                      fontWeight:filled?600:400,transition:"color 0.2s"}}>{f}</span>
                  </div>
                );
              })}
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #f0ebe3",
                fontSize:11,color:getEmptyFields().length===0?"#059669":"#8898aa",fontWeight:600}}>
                {getEmptyFields().length===0
                  ? "✅ All fields filled — ready to continue!"
                  : `${getEmptyFields().length} field${getEmptyFields().length>1?"s":""} remaining`}
              </div>
            </div>
          )}

          <div style={{background:"#eff6ff",borderRadius:14,padding:14}}>
            <div style={{fontSize:11,color:"#1d4ed8",fontWeight:600}}>
              💾 Data saved permanently in MongoDB
            </div>
            <div style={{fontSize:11,color:"#3b82f6",marginTop:4}}>
              Accessible after page refresh or re-login.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Browse Page ──────────────────────────────────────────────────────────
export default function BrowseForms({ onNavigate = () => {} }) {
  const { user } = useAuth();
  const isFaculty  = user?.role === "faculty";
  const accentColor = isFaculty ? "#059669" : "#e85d26";
  const CATEGORIES  = isFaculty ? FACULTY_CATEGORIES : STUDENT_CATEGORIES;

  const [forms,    setForms]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getFormsAPI();
        setForms(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Forms fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = forms.filter(f =>
    (category === "All" || f.category === category) &&
    (f.name.toLowerCase().includes(search.toLowerCase()) ||
     f.description?.toLowerCase().includes(search.toLowerCase()))
  );

  if (selected)
    return <FormWizard form={selected} onBack={()=>setSelected(null)} onNavigate={onNavigate} accentColor={accentColor} isFaculty={isFaculty}/>;

  const pageTitle    = isFaculty ? "Apply for Forms"       : "Browse Forms";
  const pageSubtitle = isFaculty ? "Submit leave, research, admin and professional requests" : "Search and apply for any institutional form";

  return (
    <div style={{padding:"28px 32px"}}>
      <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>{pageTitle}</h1>
      <p style={{color:"#8898aa",fontSize:13,marginBottom:20}}>{pageSubtitle}</p>

      {/* Faculty info banner */}
      {isFaculty && (
        <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",
          border:"1.5px solid #a7f3d0",borderRadius:14,padding:"14px 20px",
          marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:28}}>👨‍🏫</span>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#065f46"}}>Faculty Forms Portal</div>
            <div style={{fontSize:12,color:"#047857",marginTop:2}}>
              Browse leave, research, admin &amp; professional forms. All submissions follow the institutional approval workflow.
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
            {["Leave","Academic","Admin","Financial","HR"].map(cat=>(
              <button key={cat} onClick={()=>setCategory(cat)}
                style={{padding:"5px 12px",borderRadius:99,fontSize:11,fontWeight:700,
                  border:"1.5px solid #059669",cursor:"pointer",
                  background:category===cat?"#059669":"white",
                  color:category===cat?"white":"#059669",transition:"all 0.15s"}}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{background:"white",borderRadius:14,padding:"12px 16px",
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:18}}>🔍</span>
        <input placeholder="Search forms..." value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{border:"none",background:"transparent",fontSize:14,flex:1,outline:"none"}}/>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCategory(c)}
            style={{padding:"6px 16px",borderRadius:99,fontSize:13,fontWeight:600,
              border:"1.5px solid",cursor:"pointer",transition:"all 0.15s",
              borderColor:category===c?accentColor:"#e8e4dc",
              background:category===c?accentColor:"white",
              color:category===c?"white":"#4a5568"}}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#8898aa",fontSize:14}}>
          Loading forms from backend...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:40,marginBottom:12}}>📭</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>No forms found</div>
          <div style={{fontSize:13,color:"#8898aa"}}>Try a different search or category</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {filtered.map(f => (
            <div key={f._id} onClick={()=>setSelected(f)}
              style={{background:"white",borderRadius:14,padding:18,
                boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"1px solid #f0ebe3",
                cursor:"pointer",transition:"all 0.2s",position:"relative",overflow:"hidden"}}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 32px ${f.color||"#e85d26"}22`;}}
              onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)";}}>
              {f.popular&&(
                <span style={{position:"absolute",top:12,right:12,background:"#fef3c7",
                  color:"#92400e",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99}}>Popular</span>
              )}
              <div style={{fontSize:32,marginBottom:10}}>{f.icon}</div>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:4}}>{f.name}</h3>
              <p style={{fontSize:12,color:"#8898aa",marginBottom:12,lineHeight:1.5}}>{f.description}</p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{background:(f.color||"#e85d26")+"15",color:f.color||"#e85d26",
                  fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{f.category}</span>
                <span style={{fontSize:11,color:"#8898aa"}}>⏱ {f.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}