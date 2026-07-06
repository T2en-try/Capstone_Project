import Navbar from "../../layouts/Navbar";
import NewsSection from "../../components/userpage/NewsSection";
import MapView from "../../components/userpage/MapView";
import StatusCard from "../../components/userpage/StatusCard";
import SearchBar from "../../components/userpage/SearchBar";

export default function DashboardPage() {
  return (
    <>
      <Navbar />

      <div className="p-6 space-y-6">
        <NewsSection />

        <SearchBar />

        <div className="grid grid-cols-12 gap-6">

          <div className="col-span-8">
            <MapView />
          </div>

          <div className="col-span-4">
            <StatusCard />
          </div>

        </div>

      </div>

    </>
  );
}