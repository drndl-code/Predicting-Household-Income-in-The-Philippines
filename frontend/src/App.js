
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
        total_food_expenditure: parseFloat(form.total_food_expenditure),
        education_expenditure: parseFloat(form.education_expenditure),
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
        total_food_expenditure: parseFloat(whatIfForm.total_food_expenditure),
        education_expenditure: parseFloat(whatIfForm.education_expenditure),
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
      <h1 className="text-4xl font-extrabold mb-6 text-center text-blue-900 drop-shadow-lg tracking-tight">Predicting Household Income in the Philippines</h1>
      <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/70 border border-blue-100 p-8 rounded-2xl shadow-2xl w-full max-w-lg space-y-6">
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Region</label>
          <select name="region" value={form.region} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white">
            <option value="NCR">NCR (National Capital Region)</option>
            <option value="CAR">CAR (Cordillera Administrative Region)</option>
            <option value="Region I">Region I - Ilocos Region</option>
            <option value="Region II">Region II - Cagayan Valley</option>
            <option value="Region III">Region III - Central Luzon</option>
            <option value="Region IV-A">Region IV-A - CALABARZON</option>
            <option value="Region IV-B">Region IV-B - MIMAROPA</option>
            <option value="Region V">Region V - Bicol Region</option>
            <option value="Region VI">Region VI - Western Visayas</option>
            <option value="Region VII">Region VII - Central Visayas</option>
            <option value="Region VIII">Region VIII - Eastern Visayas</option>
            <option value="Region IX">Region IX - Zamboanga Peninsula</option>
            <option value="Region X">Region X - Northern Mindanao</option>
            <option value="Region XI">Region XI - Davao Region</option>
            <option value="Region XII">Region XII - SOCCSKSARGEN</option>
            <option value="Region XIII">Region XIII - Caraga</option>
            <option value="BARMM">BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)</option>
          </select>
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Total Food Expenditure</label>
          <input type="number" name="total_food_expenditure" value={form.total_food_expenditure} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Education Expenditure</label>
          <input type="number" name="education_expenditure" value={form.education_expenditure} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">House Floor Area (sqm)</label>
          <input type="number" name="house_floor_area" value={form.house_floor_area} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
        </div>
        <div>
          <label className="block mb-2 font-semibold text-blue-800">Number of Appliances</label>
          <input type="number" name="number_of_appliances" value={form.number_of_appliances} onChange={handleChange} className="w-full border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white" required />
        </div>
        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-3 rounded-lg font-bold text-lg shadow-lg hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-60" disabled={loading}>
          {loading ? <span className="animate-pulse">Predicting...</span> : "Predict Income"}
        </button>
        {error && <div className="text-red-600 text-center font-semibold">{error}</div>}
      </form>
      {result && (
        <div className="mt-8 bg-white/80 border border-blue-100 p-8 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center animate-fade-in">
          <h2 className="text-2xl font-extrabold mb-4 text-blue-800">Predicted Income:</h2>
          <div className="text-3xl font-bold text-green-600 mb-2">₱{result.predicted_income.toLocaleString()}</div>
          {typeof result.prediction_std === "number" && (
            <div className="text-sm text-blue-800 mb-4">≈ ± ₱{Math.round((result.prediction_std || 0)).toLocaleString()} (uncertainty)</div>
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
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, max: 1 } }
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
                <label className="block text-sm font-medium text-blue-800">Total Food Expenditure</label>
                <input type="range" min="0" max="100000" step="500" name="total_food_expenditure" value={whatIfForm?.total_food_expenditure || 0} onChange={handleWhatIfChange} className="w-full" />
                <div className="text-xs text-blue-700">₱{Number(whatIfForm?.total_food_expenditure || 0).toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800">Education Expenditure</label>
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
    </div>
  );
}

export default App;
