import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { register as registerApi, getHospitals } from "../../services/api";
import { toast } from "react-toastify";
import { FiActivity, FiUser, FiLock, FiMail, FiPhone, FiChevronDown } from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    contactNo: "",
    role: "patient",
    hospitalId: "",
    age: "",
    height: "",
    weight: "",
    specialization: "",
  });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(`/${user.role}`);
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (formData.role === "doctor") {
        delete payload.age;
        delete payload.height;
        delete payload.weight;
      }
      if (formData.role === "patient") {
        delete payload.specialization;
      }
      const { data } = await registerApi(payload);
      loginUser(data);
      toast.success("Registration successful!");
      navigate(`/${data.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: "patient", label: "Patient", color: "bg-blue-100 text-blue-700 border-blue-300" },
    { value: "doctor", label: "Doctor", color: "bg-teal-100 text-teal-700 border-teal-300" },
  ];

  const inputClass =
    "w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <FiActivity className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Register as Doctor or Patient</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Register as</label>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: r.value })}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
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
            {/* Hospital */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              <div className="relative">
                <FaHospital className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="hospitalId"
                  value={formData.hospitalId}
                  onChange={handleChange}
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

            {/* Name + Username */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="johndoe" required className={inputClass} />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required className={inputClass} />
              </div>
            </div>

            {/* Password + Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="********" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" name="contactNo" value={formData.contactNo} onChange={handleChange} placeholder="1234567890" required className={inputClass} />
                </div>
              </div>
            </div>

            {/* Patient-specific: Age, Height, Weight */}
            {formData.role === "patient" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="25" className="w-full py-3 px-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                  <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder={"5'8\""} className="w-full py-3 px-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="70 kg" className="w-full py-3 px-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                </div>
              </div>
            )}

            {/* Doctor-specific: Specialization */}
            {formData.role === "doctor" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <input type="text" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="Cardiology" className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
