
import React, { useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function App() {
  const API_URL = process.env.REACT_APP_API_URL || "https://predicting-household-income-in-the.onrender.com";
  const [form, setForm] = useState({
    region: "NCR",
    total_food_expenditure: "",
    education_expenditure: "",
    house_floor_area: "",
    number_of_appliances: ""
  });
  const [result, setResult] = useState(null);
  const [whatIfForm, setWhatIfForm] = useState(null);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/predict`, {
        ...form,
        // UI collects monthly pesos; model expects annual. Auto-convert.
        total_food_expenditure: parseFloat(form.total_food_expenditure) * 12,
        education_expenditure: parseFloat(form.education_expenditure) * 12,
        house_floor_area: parseFloat(form.house_floor_area),
        number_of_appliances: parseInt(form.number_of_appliances)
      });
      setResult(res.data);
      // Seed the What-if panel with the submitted values
      setWhatIfForm({ ...form });
      setWhatIfResult(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Prediction failed");
    }
    setLoading(false);
  };
  const toggleInfo = async () => {
    const next = !infoOpen;
    setInfoOpen(next);
    if (next && !modelInfo) {
      try {
        const res = await axios.get(`${API_URL}/model-info`);
        setModelInfo(res.data);
      } catch (e) {
        // best-effort; keep UI resilient
      }
    }
  };

  const handleWhatIfChange = (e) => {
    const { name, value } = e.target;
    setWhatIfForm((prev) => ({ ...(prev || {}), [name]: value }));
  };

  const handleSimulate = async () => {
    if (!whatIfForm) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/predict`, {
        ...whatIfForm,
        // Auto-convert monthly inputs to annual for the model
        total_food_expenditure: parseFloat(whatIfForm.total_food_expenditure) * 12,
        education_expenditure: parseFloat(whatIfForm.education_expenditure) * 12,
        house_floor_area: parseFloat(whatIfForm.house_floor_area),
        number_of_appliances: parseInt(whatIfForm.number_of_appliances)
      });
      setWhatIfResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Simulation failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-white to-blue-400 p-4">
      <h1 className="text-4xl font-extrabold mb-2 text-center text-blue-900 drop-shadow-lg tracking-tight">Predicting Household Income in the Philippines</h1>
      <div className="mb-6">
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">Explainability v1</span>
      </div>
      <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/70 border border-blue-100 p-8 rounded-2xl shadow-2xl w-full max-w-lg space-y-6">
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Region</label>
          <select name="region" value={form.region} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white">
            <option value="NCR">NCR (National Capital Region)</option>
            <option value="CAR">CAR (Cordillera Administrative Region)</option>
            <option value="Region I - Ilocos Region">Region I - Ilocos Region</option>
            <option value="Region II - Cagayan Valley">Region II - Cagayan Valley</option>
            <option value="Region III - Central Luzon">Region III - Central Luzon</option>
            <option value="Region IV-A - CALABARZON">Region IV-A - CALABARZON</option>
            <option value="Region IV-B - MIMAROPA">Region IV-B - MIMAROPA</option>
            <option value="Region V - Bicol Region">Region V - Bicol Region</option>
            <option value="Region VI - Western Visayas">Region VI - Western Visayas</option>
            <option value="Region VII - Central Visayas">Region VII - Central Visayas</option>
            <option value="Region VIII - Eastern Visayas">Region VIII - Eastern Visayas</option>
            <option value="Region IX - Zamboanga Peninsula">Region IX - Zamboanga Peninsula</option>
            <option value="Region X - Northern Mindanao">Region X - Northern Mindanao</option>
            <option value="Region XI - Davao Region">Region XI - Davao Region</option>
            <option value="Region XII - SOCCSKSARGEN">Region XII - SOCCSKSARGEN</option>
            <option value="Region XIII - Caraga">Region XIII - Caraga</option>
            <option value="BARMM">BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)</option>
          </select>
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Total Food Expenditure (monthly)</label>
          <input type="number" name="total_food_expenditure" value={form.total_food_expenditure} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
          <p className="text-xs text-blue-700 mt-1">Monthly spending on food and groceries. We’ll convert to yearly for the model.</p>
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Education Expenditure (monthly)</label>
          <input type="number" name="education_expenditure" value={form.education_expenditure} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
          <p className="text-xs text-blue-700 mt-1">Monthly costs for tuition, fees, books and other school needs. We’ll convert to yearly for the model.</p>
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">House Floor Area (sqm)</label>
          <input type="number" name="house_floor_area" value={form.house_floor_area} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
          <p className="text-xs text-blue-700 mt-1">Approximate size of your home in square meters.</p>
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Number of Appliances</label>
          <input type="number" name="number_of_appliances" value={form.number_of_appliances} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
          <p className="text-xs text-blue-700 mt-1">Count of major appliances you own (TV, fridge, washing machine, etc.). This is a count only; the model doesn’t assume they run 24/7 or measure electricity use.</p>
        </div>
        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-3 rounded-lg font-bold text-lg shadow-lg hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-60" disabled={loading}>
          {loading ? <span className="animate-pulse">Predicting...</span> : "Predict Income"}
        </button>
        {error && <div className="text-red-600 text-center font-semibold">{error}</div>}
      </form>
      {result && (
        <div className="mt-8 bg-white/80 border border-blue-100 p-8 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center animate-fade-in">
          <h2 className="text-2xl font-extrabold mb-1 text-blue-800">Predicted Income (yearly):</h2>
          <div className="text-3xl font-bold text-green-600">₱{result.predicted_income.toLocaleString()}</div>
          <div className="text-sm text-blue-800 mb-2">≈ ₱{Math.round(result.predicted_income/12).toLocaleString()} per month</div>
          {typeof result.prediction_std === "number" && (
            <div className="mb-4 text-center">
              <div className="text-sm text-blue-800">≈ ± ₱{Math.round((result.prediction_std || 0)).toLocaleString()} (uncertainty)</div>
              <div className="text-xs text-blue-700/90 mt-1">
                Uncertainty shows how much the model’s trees disagree for these inputs; larger means less confidence. Units: PHP/year.
              </div>
            </div>
          )}
          <h3 className="font-semibold mb-3 text-blue-700">Top Drivers</h3>
          <div className="w-full md:w-3/4">
            <Bar
              data={{
                labels: result.important_features,
                datasets: [
                  {
                    label: "Feature Importance (relative)",
                    data: result.feature_importances || [1, 0.8, 0.6],
                    backgroundColor: ["#2563eb", "#38bdf8", "#a7f3d0"]
                  }
                ]
              }}
              options={{
                indexAxis: "y",
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const v = ctx.parsed.x;
                        return ` ${(v * 100).toFixed(0)}% impact`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                      callback: (val) => `${Math.round(val * 100)}%`
                    }
                  }
                }
              }}
            />
          </div>
          {/* Plain-language explainer */}
          <div className="mt-6 w-full md:w-3/4">
            <h4 className="font-semibold text-blue-700 mb-2">Why this result?</h4>
            <ul className="space-y-2 text-sm text-blue-900">
              {result.important_features.map((name, idx) => {
                const score = (result.feature_importances && result.feature_importances[idx]) || [1, 0.8, 0.6][idx] || 0;
                const level = score >= 0.66 ? "High" : score >= 0.33 ? "Medium" : "Low";
                const levelColor = level === "High" ? "bg-green-100 text-green-800" : level === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800";
                return (
                  <li key={name} className="flex items-center justify-between bg-white/70 border border-blue-100 rounded-lg px-3 py-2">
                    <span>{name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${levelColor}`}>{level} impact</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* What-if panel */}
          <div className="mt-8 w-full md:w-3/4">
            <h4 className="font-semibold text-blue-700 mb-3">What if I change the inputs?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800">Total Food Expenditure (monthly)</label>
                <input type="range" min="0" max="100000" step="500" name="total_food_expenditure" value={whatIfForm?.total_food_expenditure || 0} onChange={handleWhatIfChange} className="w-full" />
                <div className="text-xs text-blue-700">₱{Number(whatIfForm?.total_food_expenditure || 0).toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800">Education Expenditure (monthly)</label>
                <input type="range" min="0" max="50000" step="250" name="education_expenditure" value={whatIfForm?.education_expenditure || 0} onChange={handleWhatIfChange} className="w-full" />
                <div className="text-xs text-blue-700">₱{Number(whatIfForm?.education_expenditure || 0).toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800">House Floor Area (sqm)</label>
                <input type="range" min="10" max="300" step="1" name="house_floor_area" value={whatIfForm?.house_floor_area || 0} onChange={handleWhatIfChange} className="w-full" />
                <div className="text-xs text-blue-700">{Number(whatIfForm?.house_floor_area || 0)} sqm</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800">Number of Appliances</label>
                <input type="range" min="0" max="30" step="1" name="number_of_appliances" value={whatIfForm?.number_of_appliances || 0} onChange={handleWhatIfChange} className="w-full" />
                <div className="text-xs text-blue-700">{Number(whatIfForm?.number_of_appliances || 0)} items</div>
                <div className="text-[10px] text-blue-700/80">Count of owned devices only; no 24/7 usage assumption.</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={handleSimulate} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60" disabled={loading || !whatIfForm}>
                {loading ? "Simulating..." : "Simulate"}
              </button>
              {whatIfResult && (
                <div className="text-sm text-blue-900">
                  New prediction: <span className="font-bold text-green-700">₱{whatIfResult.predicted_income.toLocaleString()}</span>
                  {result && (
                    <span> ({whatIfResult.predicted_income - result.predicted_income >= 0 ? "+" : ""}{(whatIfResult.predicted_income - result.predicted_income).toLocaleString()})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How the model works */}
      <div className="mt-10 w-full max-w-3xl">
        <button onClick={toggleInfo} className="w-full text-left bg-white/80 border border-blue-100 rounded-xl px-4 py-3 shadow flex items-center justify-between">
          <span className="font-semibold text-blue-800">How this model works (dataset & training)</span>
          <span className="text-blue-700">{infoOpen ? "▲" : "▼"}</span>
        </button>
        {infoOpen && (
          <div className="p-4 bg-white/70 border border-blue-100 rounded-b-xl shadow">
            {!modelInfo ? (
              <div className="text-sm text-blue-700">Loading…</div>
            ) : (
              <div className="space-y-4">
                {/* Pipeline diagram (SVG) */}
                <div>
                  <div className="text-sm font-semibold text-blue-800 mb-2">Training pipeline</div>
                  <div className="w-full overflow-x-auto">
                    <svg role="img" aria-label="Pipeline diagram" viewBox="0 0 1200 160" className="min-w-[700px] w-full h-40">
                      <defs>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L9,3 z" fill="#1e40af" />
                        </marker>
                        <linearGradient id="box" x1="0" x2="1">
                          <stop offset="0%" stopColor="#eef2ff" />
                          <stop offset="100%" stopColor="#e0f2fe" />
                        </linearGradient>
                      </defs>

                      {/** Helper to draw a box */}
                      {/* Dataset */}
                      <rect x="20" y="30" rx="10" ry="10" width="200" height="80" fill="url(#box)" stroke="#93c5fd" />
                      <text x="120" y="60" textAnchor="middle" fontSize="12" fill="#1e3a8a">Dataset</text>
                      <text x="120" y="85" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">FIES CSV</text>

                      {/* Preprocessing */}
                      <rect x="260" y="30" rx="10" ry="10" width="230" height="80" fill="url(#box)" stroke="#93c5fd" />
                      <text x="375" y="60" textAnchor="middle" fontSize="12" fill="#1e3a8a">Preprocessing</text>
                      <text x="375" y="85" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">OneHot + Scaling</text>

                      {/* Model */}
                      <rect x="530" y="30" rx="10" ry="10" width="200" height="80" fill="url(#box)" stroke="#93c5fd" />
                      <text x="630" y="60" textAnchor="middle" fontSize="12" fill="#1e3a8a">Model</text>
                      <text x="630" y="85" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">Random Forest</text>

                      {/* Prediction */}
                      <rect x="770" y="30" rx="10" ry="10" width="200" height="80" fill="url(#box)" stroke="#93c5fd" />
                      <text x="870" y="60" textAnchor="middle" fontSize="12" fill="#1e3a8a">Prediction</text>
                      <text x="870" y="85" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">₱ estimate</text>

                      {/* Explainability */}
                      <rect x="1010" y="30" rx="10" ry="10" width="170" height="80" fill="url(#box)" stroke="#93c5fd" />
                      <text x="1095" y="60" textAnchor="middle" fontSize="12" fill="#1e3a8a">Explainability</text>
                      <text x="1095" y="85" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">Top drivers + ±σ</text>

                      {/* Arrows */}
                      <line x1="220" y1="70" x2="260" y2="70" stroke="#1e40af" strokeWidth="2.5" markerEnd="url(#arrow)" />
                      <line x1="490" y1="70" x2="530" y2="70" stroke="#1e40af" strokeWidth="2.5" markerEnd="url(#arrow)" />
                      <line x1="730" y1="70" x2="770" y2="70" stroke="#1e40af" strokeWidth="2.5" markerEnd="url(#arrow)" />
                      <line x1="970" y1="70" x2="1010" y2="70" stroke="#1e40af" strokeWidth="2.5" markerEnd="url(#arrow)" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs text-blue-700">Dataset</div>
                    <div className="font-semibold">{modelInfo.dataset_name}</div>
                    <a className="text-xs text-blue-600 underline" href={modelInfo.dataset_source} target="_blank" rel="noreferrer">View on Kaggle</a>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs text-blue-700">Rows</div>
                    <div className="font-semibold">{modelInfo.rows?.toLocaleString?.() || modelInfo.rows}</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs text-blue-700">Model</div>
                    <div className="font-semibold">{modelInfo.model?.type}</div>
                    <div className="text-xs text-blue-700">n_estimators: {modelInfo.model?.params?.n_estimators}, max_depth: {String(modelInfo.model?.params?.max_depth)}</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs text-blue-700">Test metrics (30%)</div>
                    <div className="text-xs">R²: <span className="font-semibold">{modelInfo.metrics?.r2?.toFixed?.(3)}</span></div>
                    <div className="text-xs">RMSE: <span className="font-semibold">₱{Math.round(modelInfo.metrics?.rmse || 0).toLocaleString()}</span></div>
                    <div className="text-xs">MAE: <span className="font-semibold">₱{Math.round(modelInfo.metrics?.mae || 0).toLocaleString()}</span></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-blue-800 mb-2">Features used</div>
                  <div className="flex flex-wrap gap-2">
                    {(modelInfo.features_used || []).map((f) => (
                      <span key={f} className="text-xs px-2 py-1 bg-blue-50 text-blue-800 rounded border border-blue-100">{f}</span>
                    ))}
                  </div>
                </div>

                {modelInfo.top_feature_importances && modelInfo.top_feature_importances.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-blue-800 mb-2">Global top features</div>
                    <ul className="text-sm list-disc list-inside text-blue-900">
                      {modelInfo.top_feature_importances.map((it) => (
                        <li key={it.name}>{it.name}: {(it.importance * 100).toFixed(1)}%</li>
                      ))}
                    </ul>
                  </div>
                )}

                {modelInfo.preview_rows && modelInfo.preview_rows.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-blue-800 mb-2">Dataset preview (first 5 rows)</div>
                    <div className="overflow-auto border rounded">
                      <table className="min-w-full text-xs">
                        <thead className="bg-blue-50">
                          <tr>
                            {modelInfo.preview_columns.map((c) => (
                              <th key={c} className="px-2 py-1 text-left text-blue-800 border-b">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modelInfo.preview_rows.map((row, i) => (
                            <tr key={i} className="odd:bg-white even:bg-blue-50/30">
                              {modelInfo.preview_columns.map((c) => (
                                <td key={c} className="px-2 py-1 border-b">{String(row[c])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
