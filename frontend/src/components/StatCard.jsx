const StatCard = ({ title, value, icon, color = "blue", subtitle }) => {
  const colors = {
    blue: "from-blue-500 to-blue-600 shadow-blue-200",
    green: "from-emerald-500 to-emerald-600 shadow-emerald-200",
    purple: "from-purple-500 to-purple-600 shadow-purple-200",
    orange: "from-orange-500 to-orange-600 shadow-orange-200",
    teal: "from-teal-500 to-teal-600 shadow-teal-200",
    red: "from-red-500 to-red-600 shadow-red-200",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200",
    pink: "from-pink-500 to-pink-600 shadow-pink-200",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg flex items-center justify-center text-white text-xl`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
