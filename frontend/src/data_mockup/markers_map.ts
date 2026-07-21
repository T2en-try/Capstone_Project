import L from "leaflet";

export interface RoadMarker {
  id: number;
  title: string;
  status: "pending" | "working" | "completed" | "forward";
  position: [number, number];
}

export const markers: RoadMarker[] = [
  {
    id: 1,
    title: "หลุมขนาดใหญ่",
    status: "pending",
    position: [14.9799, 102.0977],
  },
  {
    id: 2,
    title: "ถนนทรุดตัว",
    status: "working",
    position: [14.9750, 102.104],
  },
  {
    id: 3,
    title: "ไฟฟ้าพัง",
    status: "completed",
    position: [14.9705, 102.088],
  },
  {
    id: 4,
    title: "พื้นแตกร้าว",
    status: "forward",
    position: [14.9728, 102.101],
  },
];