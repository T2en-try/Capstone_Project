import { FileText } from "lucide-react";
import { dashboardStats } from "../../mock/user_dashboard";

export default function StatusCard() {

  const total = dashboardStats.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <div className="bg-paper border border-line rounded-2xl shadow-sm p-6">

      <div className="space-y-4">

        {dashboardStats.map((item) => {

          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={`${item.bgColor} rounded-2xl border border-line p-4 hover:shadow transition`}
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

                  <p className="text-sm text-asphalt/70 mt-1">
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

      <div className="mt-6 bg-mist rounded-2xl p-5 flex justify-between border border-line">

        <div className="flex gap-2 items-center text-asphalt">

          <FileText className="text-mark"/>

          <span className="font-semibold text-ink">
            รายงานทั้งหมด
          </span>

        </div>

        <span className="text-3xl font-bold text-mark-deep">
          {total}
        </span>

      </div>

    </div>
  );
}