import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginApi, getHospitals } from "../../services/api";
import { toast } from "react-toastify";
import { FiActivity, FiUser, FiLock, FiChevronDown } from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "patient",
    hospitalId: "",
  });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const { data } = await getHospitals();
        setHospitals(data);
      } catch {
        // silent
      }
    };
    fetchHospitals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (formData.role === "admin") {
        delete payload.hospitalId;
      }
      const { data } = await loginApi(payload);
      loginUser(data);
      toast.success(`Welcome back, ${data.name}!`);
      navigate(`/${data.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: "patient", label: "Patient", color: "bg-blue-100 text-blue-700 border-blue-300" },
    { value: "doctor", label: "Doctor", color: "bg-teal-100 text-teal-700 border-teal-300" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <FiActivity className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MediCare HMS</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: r.value, hospitalId: "" })}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                    formData.role === r.value
                      ? r.color + " shadow-sm"
                      : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hospital Selector (not for admin) */}
            {formData.role !== "admin" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                <div className="relative">
                  <FaHospital className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={formData.hospitalId}
                    onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                    required
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none text-sm"
                  >
                    <option value="">Select Hospital</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your username"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Link to register */}
          <p className="text-center mt-6 text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
