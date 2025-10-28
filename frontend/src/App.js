
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
    } catch (err) {
      setError(err.response?.data?.detail || "Prediction failed");
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
        <div className="mt-8 bg-white/80 border border-blue-100 p-8 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col items-center animate-fade-in">
          <h2 className="text-2xl font-extrabold mb-4 text-blue-800">Predicted Income:</h2>
          <div className="text-3xl font-bold text-green-600 mb-6">₱{result.predicted_income.toLocaleString()}</div>
          <h3 className="font-semibold mb-3 text-blue-700">Top Features</h3>
          <div className="w-full">
            <Bar
              data={{
                labels: result.important_features,
                datasets: [
                  {
                    label: "Feature Importance (relative)",
                    data: [1, 0.8, 0.6], // Placeholder, replace with actual importances if available
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
        </div>
      )}
    </div>
  );
}

export default App;
