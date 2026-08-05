import os
import pickle
import numpy as np
import pandas as pd
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from sklearn.ensemble import RandomForestRegressor

# =====================================================================
# โครงสร้างข้อมูล (Data Model) สำหรับรับข้อมูลจาก Engine หลัก
# =====================================================================
class RoadReportData:
    # 🛡️ ใส่ **kwargs ไว้ท้ายสุด ป้องกัน Error เวลามีคนส่งตัวแปรชื่อแปลกๆ เข้ามา
    def __init__(self, cv_ratio=0.0, cv_severity=0, rain_12m=0.0, soil_moist=0.0, ndvi=0.0, 
                 material="Unknown", road_type_enc=0, crowd_30d=0, comm_impact=0.0, 
                 slope=0.0, lanes=2, speed_limit=50.0, nearest_poi_distance_m=1000.0, **kwargs):
                 
        self.cv_damage_ratio_percent = float(cv_ratio)
        self.cv_max_severity_score = int(cv_severity)
        self.rainfall_12m = float(rain_12m)
        self.soil_moisture = float(soil_moist)
        self.ndvi_index = float(ndvi)
        self.surface_material = self._normalize_material(material)
        self.road_type_encoded = float(road_type_enc)
        self.crowd_count_30d = int(crowd_30d)
        self.community_impact_score = float(comm_impact)
        
        # ฟีเจอร์ใหม่จาก Sentinel-2 และ OSMnx
        self.slope = float(slope)
        self.lanes = int(lanes)
        self.speed_limit = float(speed_limit)
        self.nearest_poi_distance_m = float(nearest_poi_distance_m)

    def _normalize_material(self, raw_material):
        raw_str = str(raw_material).lower()
        if "asphalt" in raw_str or "ยางมะตอย" in raw_str:
            return "Asphalt"
        return "Concrete"

# =====================================================================
# 1. Heuristic Engine (สมการตายตัว)
# =====================================================================
class HeuristicFusionEngine:
    @staticmethod
    def predict_ppi(data: RoadReportData) -> float:
        # 🛑 กฎเหล็ก (Gatekeeper): ถ้าไม่มีความเสียหาย (แผลเป็น 0) ให้ 0 คะแนนทันที
        if data.cv_max_severity_score == 0 and data.cv_damage_ratio_percent == 0.0:
            return 0.0

        base_score = (data.cv_damage_ratio_percent * 0.5) + \
                     (data.cv_max_severity_score * 10) + \
                     (data.crowd_count_30d * 5)
                     
        env_risk_bonus = 0
        rain_score = min(20.0, data.rainfall_12m * 0.01) 
        env_risk_bonus += rain_score
        
        if data.surface_material == 'Asphalt' and data.rainfall_12m > 1000:
            env_risk_bonus += 10
        if data.soil_moisture > 0.4:
            env_risk_bonus += 5
        if data.ndvi_index > 0.3:
            env_risk_bonus += 5
            
        if data.slope > 10:
            env_risk_bonus += 10
        if data.nearest_poi_distance_m < 500:
            env_risk_bonus += 10
            
        final_score = base_score + env_risk_bonus
        return min(100.0, max(0.0, final_score))

# =====================================================================
# 2. Fuzzy Logic Engine
# =====================================================================
class FuzzyFusionEngine:
    def __init__(self):
        self.fuzzy_sim = self._setup_system()

    def _setup_system(self):
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

        # Extended Rule Matrix
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

    def predict_ppi(self, data: RoadReportData) -> float:
        self.fuzzy_sim.input['severity'] = data.cv_max_severity_score
        self.fuzzy_sim.input['rainfall'] = data.rainfall_12m
        self.fuzzy_sim.input['soil'] = data.soil_moisture
        self.fuzzy_sim.input['crowd'] = data.crowd_count_30d
        self.fuzzy_sim.input['road_type'] = data.road_type_encoded
        self.fuzzy_sim.input['impact'] = data.community_impact_score
        
        try:
            self.fuzzy_sim.compute()
            return float(self.fuzzy_sim.output['ppi'])
        except Exception as e:
            print(f"⚠️ [FuzzyLogic Error]: No rules triggered, falling back to heuristic. Details: {e}")
            return HeuristicFusionEngine.predict_ppi(data)

# =====================================================================
# 3. Machine Learning Engine (รองรับการ Save/Load Pickle File)
# =====================================================================
class MLFusionEngine:
    def __init__(self, model_path="ppi_rf_model_v3.pkl"):
        self.model_path = model_path
        self.model = None
        self._initialize_model()

    def _initialize_model(self):
        if os.path.exists(self.model_path):
            print(f"[MLFusionEngine] Loading pre-trained model from {self.model_path}")
            with open(self.model_path, "rb") as f:
                self.model = pickle.load(f)
        else:
            print(f"[MLFusionEngine] No pre-trained model found. Training dynamically...")
            self._train_and_save()

    def _train_and_save(self):
        np.random.seed(42)
        n_samples = 2000
        
        df = pd.DataFrame({
            'cv_ratio': np.random.uniform(0, 80, n_samples),
            'cv_severity': np.random.choice([0, 2, 4, 5], n_samples),
            'rain_12m': np.random.uniform(500, 2500, n_samples),
            'soil_moist': np.random.uniform(0.1, 0.8, n_samples),
            'is_asphalt': np.random.choice([1, 0], n_samples),
            'road_type_enc': np.random.uniform(1, 4, n_samples),
            'crowd_30d': np.random.randint(0, 30, n_samples),
            'comm_impact': np.random.uniform(0, 100, n_samples),
            'speed_limit': np.random.choice([30, 50, 80, 90], n_samples)
        })

        y_train = []
        for _, row in df.iterrows():
            mat = 'Asphalt' if row['is_asphalt'] == 1 else 'Concrete'
            mock_data = RoadReportData(
                cv_ratio=row['cv_ratio'], cv_severity=row['cv_severity'], 
                rain_12m=row['rain_12m'], soil_moist=row['soil_moist'], 
                material=mat, road_type_enc=row['road_type_enc'], 
                crowd_30d=row['crowd_30d'], comm_impact=row['comm_impact'],
                speed_limit=row['speed_limit']
            )
            score = HeuristicFusionEngine.predict_ppi(mock_data) + np.random.normal(0, 2)
            y_train.append(min(100.0, max(0.0, score)))

        self.model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        self.model.fit(df, y_train)

        with open(self.model_path, "wb") as f:
            pickle.dump(self.model, f)
        print(f"[MLFusionEngine] Model trained and saved to {self.model_path}")

    def predict_ppi(self, data: RoadReportData) -> float:
        if not self.model:
            raise RuntimeError("Model is not initialized.")
            
        is_asphalt = 1 if data.surface_material == 'Asphalt' else 0
        X_test = pd.DataFrame({
            'cv_ratio': [data.cv_damage_ratio_percent], 
            'cv_severity': [data.cv_max_severity_score],
            'rain_12m': [data.rainfall_12m], 
            'soil_moist': [data.soil_moisture],
            'is_asphalt': [is_asphalt],
            'road_type_enc': [data.road_type_encoded], 
            'crowd_30d': [data.crowd_count_30d],
            'comm_impact': [data.community_impact_score],
            'speed_limit': [data.speed_limit]
        })
        
        return float(self.model.predict(X_test)[0])

# =====================================================================
# Wrapper สำหรับเรียกใช้ง่ายๆ (Exported Objects)
# =====================================================================
ml_engine = MLFusionEngine()
fuzzy_engine = FuzzyFusionEngine()
heuristic_engine = HeuristicFusionEngine()