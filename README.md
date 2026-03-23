# Road Remaining Life Prediction System

## สมาชิกผู้จัดทำ
1. นายวัชรเกียรติ พิทักษา รหัสนักศึกษา B6613969
2. นายวชิระ แก้วเมือง รหัสนักศึกษา B6612726
3. นายพชร โจชัวร์ คริกเค รหัสนักศึกษา B6608972
4. นายธนภัทร เงินเส็ง รหัสนักศึกษา B6618520

## อาจารย์ที่ปรึกษา
รองศาสตราจารย์ ดร. ปรเมศวร์ห่อแก้ว

## วิธีการติดตั้งและรันระบบ AI 

1. Clone โปรเจกต์ลงเครื่อง: `git clone ...`
2. เข้าไปที่โฟลเดอร์: `cd backend` 
3. ติดตั้งไลบรารี: `pip install -r requirements.txt`
4. ไปที่ https://drive.google.com/drive/folders/1G45AjreZVy1xsrpG1CFhTak6aRH4UEVz 
5. นำไฟล์ `faster_rcnn_road_damage_final.pth` ในโฟลเดอร์ `Model_Train` ที่โหลดมา ไปวางไว้ในโฟลเดอร์ `backend` (ให้อยู่ระดับเดียวกับ `main.py`)
6. นำไฟล์ `Road-maintain.json` ในโฟลเดอร์ `Config` ที่โหลดมา ไปวางไว้ในโฟลเดอร์ `backend/app/services` (ให้อยู่ระดับเดียวกับ `context_api.py`)
7. สั่งรันเซิร์ฟเวอร์ backend : `uvicorn main:app --reload`
8. ไปที่ `cd frontend` รันคำสั่ง `npm install`
9. สั่งรันเซิร์ฟเวอร์ frontend : `npm run dev`
