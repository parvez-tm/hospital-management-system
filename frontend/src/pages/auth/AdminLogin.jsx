import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginApi } from "../../services/api";
import { toast } from "react-toastify";
import { FiShield, FiUser, FiLock } from "react-icons/fi";

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        role: "admin",
      };
      const { data } = await loginApi(payload);
      if (data.role !== "admin") {
        toast.error("Unauthorized access");
        return;
      }
      loginUser(data);
      toast.success(`Welcome back, ${data.name}!`);
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg shadow-purple-900/40 mb-4">
            <FiShield className="text-white text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-200">System Access</h1>
          <p className="text-gray-500 text-xs mt-1">Authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all text-sm"
                  placeholder="Enter username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-purple-900/30 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Authenticate"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-gray-600">
          This is a restricted area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
