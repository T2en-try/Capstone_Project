import { FileText } from "lucide-react";
import { dashboardStats } from "../../data/dashboardStats";

export default function StatusCard() {

  const total = dashboardStats.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">

      <div className="space-y-4">

        {dashboardStats.map((item) => {

          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={`${item.bgColor} rounded-xl p-4 hover:shadow transition`}
            >

              <div className="flex justify-between">

                <div>

                  <div className="flex items-center gap-2">

                    <Icon
                      size={22}
                      className={item.textColor}
                    />

                    <span
                      className={`font-semibold ${item.textColor}`}
                    >
                      {item.title}
                    </span>

                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    {item.description}
                  </p>

                </div>

                <span
                  className={`text-3xl font-bold ${item.textColor}`}
                >
                  {item.value}
                </span>

              </div>

            </div>
          );

        })}

      </div>

      <div className="mt-6 bg-gray-100 rounded-xl p-5 flex justify-between">

        <div className="flex gap-2 items-center">

          <FileText className="text-orange-500"/>

          <span className="font-semibold">
            รายงานทั้งหมด
          </span>

        </div>

        <span className="text-3xl font-bold text-orange-500">
          {total}
        </span>

      </div>

    </div>
  );
}