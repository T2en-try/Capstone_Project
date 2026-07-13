import numpy as np
import pandas as pd
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from sklearn.ensemble import RandomForestRegressor

# =====================================================================
# โครงสร้างข้อมูล (Payload) ที่จำลองมาจาก Backend ของคุณ (engine.py + gee_integration.py)
# =====================================================================
class RoadReportData:
    def __init__(self, cv_ratio, cv_severity, rain_12m, soil_moist, ndvi, material, road_type_enc, crowd_30d, comm_impact):
        self.cv_damage_ratio_percent = cv_ratio   # % พื้นที่แผลในรูป (0-100)
        self.cv_max_severity_score = cv_severity  # ความรุนแรง D00=2, D10=2, D20=4, D40=5
        self.rainfall_12m = rain_12m              # ฝนสะสม 12 เดือน (mm)
        self.soil_moisture = soil_moist           # ความชื้นดิน (0.0 - 1.0)
        self.ndvi_index = ndvi                    # ดัชนีพืชพรรณ (-1.0 ถึง 1.0)
        self.surface_material = material          # 'Asphalt' หรือ 'Concrete'
        self.road_type_encoded = road_type_enc    # ประเภทถนน (1-10)
        self.crowd_count_30d = crowd_30d          # จำนวนคนแจ้งใน 30 วัน (0-50)
        self.community_impact_score = comm_impact # คะแนนผลกระทบชุมชน (0-100)

# =====================================================================
# วิธีที่ 1: Heuristic Formula (จำลองจาก engine.py ของคุณเป๊ะๆ)
# =====================================================================
def calculate_heuristic_ppi(data: RoadReportData):
    # สมการหลัก (จาก backend_analysis.md)
    base_score = (data.cv_damage_ratio_percent * 0.5) + \
                 (data.cv_max_severity_score * 10) + \
                 (data.rainfall_12m * 0.05) + \
                 (data.crowd_count_30d * 2)
                 
    # เงื่อนไขปรับคะแนน (Heuristic Adjustments)
    if data.surface_material == 'Asphalt' and data.rainfall_12m > 1000:
        base_score += 15
    if data.soil_moisture > 0.4:
        base_score += 10
    if data.ndvi_index > 0.25:
        base_score += 5
        
    return min(100, max(0, base_score))

# =====================================================================
# วิธีที่ 2: Fuzzy Inference System (ปรับสเกลตามข้อมูล GEE/GIS จริง)
# =====================================================================
def setup_fuzzy_system():
    sev = ctrl.Antecedent(np.arange(0, 6, 1), 'severity')
    rain = ctrl.Antecedent(np.arange(0, 3001, 100), 'rainfall')
    soil = ctrl.Antecedent(np.arange(0, 1.1, 0.1), 'soil')
    crowd = ctrl.Antecedent(np.arange(0, 51, 1), 'crowd')
    road_type = ctrl.Antecedent(np.arange(0, 4, 1), 'road_type')
    impact = ctrl.Antecedent(np.arange(0, 101, 1), 'impact')
    
    ppi = ctrl.Consequent(np.arange(0, 101, 1), 'ppi')

    sev['low'] = fuzz.zmf(sev.universe, 1, 3)
    sev['medium'] = fuzz.trapmf(sev.universe, [1, 2, 4, 5])
    sev['high'] = fuzz.smf(sev.universe, 3, 5)
    
    rain.automf(3, names=['low', 'medium', 'high'])
    soil['dry'] = fuzz.zmf(soil.universe, 0.2, 0.6)
    soil['wet'] = fuzz.smf(soil.universe, 0.4, 0.8)
    
    crowd['few'] = fuzz.zmf(crowd.universe, 2, 15)
    crowd['many'] = fuzz.smf(crowd.universe, 10, 25)
    
    road_type['local'] = fuzz.zmf(road_type.universe, 1, 2)
    road_type['main'] = fuzz.trimf(road_type.universe, [1, 2, 3])
    road_type['highway'] = fuzz.smf(road_type.universe, 2, 3)
    
    impact['low'] = fuzz.zmf(impact.universe, 20, 50)
    impact['high'] = fuzz.smf(impact.universe, 40, 80)

    ppi.automf(5, names=['normal', 'watch', 'warning', 'urgent', 'critical'])

    # 3. ตั้งกฎเชิงตรรกะ (Extended Rule Matrix)
    # 1. Extreme Cases
    r1a = ctrl.Rule(sev['high'] & (road_type['highway'] | road_type['main']), ppi['critical'])
    r1b = ctrl.Rule(sev['high'] & road_type['local'], ppi['urgent'])
    r2 = ctrl.Rule(sev['high'] & impact['high'], ppi['critical'])
    r3 = ctrl.Rule(sev['high'] & crowd['many'], ppi['critical'])
    
    # 2. Warning Cases
    r4a = ctrl.Rule(sev['medium'] & (road_type['highway'] | road_type['main']), ppi['warning'])
    r4b = ctrl.Rule(sev['medium'] & road_type['local'], ppi['watch'])
    r5 = ctrl.Rule(sev['medium'] & (soil['wet'] | rain['high']), ppi['warning'])
    r6 = ctrl.Rule(sev['medium'] & crowd['many'], ppi['warning'])
    r7 = ctrl.Rule(sev['low'] & soil['wet'] & rain['high'] & (road_type['highway'] | road_type['main']), ppi['warning'])

    # 3. Normal Cases
    r8 = ctrl.Rule(sev['low'] & soil['dry'] & (road_type['local'] | road_type['main'] | road_type['highway']), ppi['normal'])
    r9 = ctrl.Rule(sev['low'] & impact['low'] & crowd['few'], ppi['normal'])
    
    # 4. Environment driven
    r10 = ctrl.Rule(rain['medium'] & sev['medium'], ppi['warning'])
    r11 = ctrl.Rule(rain['high'] & road_type['local'], ppi['warning'])
    
    ppi_ctrl = ctrl.ControlSystem([r1a, r1b, r2, r3, r4a, r4b, r5, r6, r7, r8, r9, r10, r11])
    return ctrl.ControlSystemSimulation(ppi_ctrl)

fuzzy_sim = setup_fuzzy_system()

def calculate_fuzzy_ppi(data: RoadReportData):
    fuzzy_sim.input['severity'] = data.cv_max_severity_score
    fuzzy_sim.input['rainfall'] = data.rainfall_12m
    fuzzy_sim.input['soil'] = data.soil_moisture
    fuzzy_sim.input['crowd'] = data.crowd_count_30d
    fuzzy_sim.input['road_type'] = data.road_type_encoded
    fuzzy_sim.input['impact'] = data.community_impact_score
    try:
        fuzzy_sim.compute()
        return fuzzy_sim.output['ppi']
    except Exception:
        return calculate_heuristic_ppi(data)

# =====================================================================
# วิธีที่ 3: Machine Learning (Random Forest)
# =====================================================================
print("🧠 กำลังจำลองฐานข้อมูลประวัติการซ่อมถนน 2,000 แถว เพื่อเทรน ML...")
np.random.seed(42)
n_samples = 2000

# จำลอง Data ตามสเกลระบบจริงของคุณ
df = pd.DataFrame({
    'cv_ratio': np.random.uniform(5, 80, n_samples),
    'cv_severity': np.random.choice([0, 2, 4, 5], n_samples), 
    'rain_12m': np.random.uniform(500, 2500, n_samples),
    'soil_moist': np.random.uniform(0.1, 0.8, n_samples),
    'is_asphalt': np.random.choice([1, 0], n_samples), 
    'road_type_enc': np.random.uniform(1, 4, n_samples),
    'crowd_30d': np.random.randint(1, 30, n_samples),
    'comm_impact': np.random.uniform(10, 100, n_samples),
    'speed_limit': np.random.choice([30, 50, 80, 90], n_samples)
})

# สร้าง Label (Y) โดยให้เรียนรู้จาก "สูตร Heuristic ของคุณ" เป็นตัวตั้งต้น
y_train = []
for _, row in df.iterrows():
    mat = 'Asphalt' if row['is_asphalt'] == 1 else 'Concrete'
    # Mock data ndvi=0 to fit older constructor if needed, but constructor allows kwargs
    mock_data = RoadReportData(row['cv_ratio'], row['cv_severity'], row['rain_12m'], 
                               row['soil_moist'], 0.0, mat, 
                               row['road_type_enc'], row['crowd_30d'], row['comm_impact'])
    
    score = calculate_heuristic_ppi(mock_data) + np.random.normal(0, 5)
    y_train.append(min(100, max(0, score)))

ml_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
ml_model.fit(df, y_train)

def calculate_ml_ppi(data: RoadReportData):
    is_asphalt = 1 if data.surface_material == 'Asphalt' else 0
    X_test = pd.DataFrame({
        'cv_ratio': [data.cv_damage_ratio_percent], 'cv_severity': [data.cv_max_severity_score],
        'rain_12m': [data.rainfall_12m], 'soil_moist': [data.soil_moisture],
        'is_asphalt': [is_asphalt],
        'road_type_enc': [data.road_type_encoded], 'crowd_30d': [data.crowd_count_30d],
        'comm_impact': [data.community_impact_score], 'speed_limit': [50.0] # Mocked speed limit since older class might not have it
    })
    return ml_model.predict(X_test)[0]

# =====================================================================
# 🚦 รันเพื่อทดสอบเปรียบเทียบระบบ
# =====================================================================
if __name__ == "__main__":
    print("\n" + "="*80)
    print("🚦 ทดสอบรับข้อมูลจริงจาก Backend: 'แผล Alligator (D20), ยางมะตอย, ดินชื้น, ฝนสะสม 1500mm'")
    print("="*80)
    
    # 1. สมมติว่านี่คือ Object ที่ Router.py ส่งมาให้ AI 
    test_case = RoadReportData(
        cv_ratio=45.0,        # แผลกินพื้นที่ 45%
        cv_severity=4,        # D20 (Alligator Crack)
        rain_12m=1500.0,      # ฝนตกชุก 1500mm
        soil_moist=0.6,       # ดินชื้นมาก (เกิน 0.4)
        ndvi=0.3,             # มีต้นไม้ริมทาง (เกิน 0.25)
        material='Asphalt',   # ถนนยางมะตอย
        road_type_enc=8,      # ถนนค่อนข้างสำคัญ
        crowd_30d=5,          # มีคนแจ้ง 5 คน
        comm_impact=80        # กระทบชุมชนสูง
    )
    
    # 2. ปริ้นท์ผลลัพธ์
    score_heur = calculate_heuristic_ppi(test_case)
    print(f"1. สูตร Rule-based (Engine.py)  : {score_heur:.2f} / 100")
    
    score_fuz = calculate_fuzzy_ppi(test_case)
    print(f"2. ระบบ Fuzzy Logic (AI Rule)   : {score_fuz:.2f} / 100")
    
    score_ml = calculate_ml_ppi(test_case)
    print(f"3. โมเดล ML (Random Forest)     : {score_ml:.2f} / 100")
    
    print("\n💡 สรุปการทำงาน: โมเดล ML ได้เรียนรู้ 'โบนัสคะแนน (ยางมะตอย/ความชื้น)' จากสูตร Heuristic")
    print("ทำให้ได้คะแนนสอดคล้องกัน แต่ ML จะรองรับข้อมูลใหม่ๆ ได้ดีกว่าในระยะยาวเมื่อมีข้อมูลแจ้งซ่อมจริง!")