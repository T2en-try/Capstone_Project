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
    def __init__(self, cv_ratio, cv_severity, rain_12m, soil_moist, ndvi, material, road_type_enc, crowd_30d, comm_impact):
        self.cv_damage_ratio_percent = float(cv_ratio)
        self.cv_max_severity_score = int(cv_severity)
        self.rainfall_12m = float(rain_12m)
        self.soil_moisture = float(soil_moist)
        self.ndvi_index = float(ndvi)
        # Normalization จัดการภาษาไทยที่ติดมาจาก GEE
        self.surface_material = self._normalize_material(material)
        self.road_type_encoded = float(road_type_enc)
        self.crowd_count_30d = int(crowd_30d)
        self.community_impact_score = float(comm_impact)

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
        base_score = (data.cv_damage_ratio_percent * 0.5) + \
                     (data.cv_max_severity_score * 10) + \
                     (data.rainfall_12m * 0.05) + \
                     (data.crowd_count_30d * 2)
                     
        if data.surface_material == 'Asphalt' and data.rainfall_12m > 1000:
            base_score += 15
        if data.soil_moisture > 0.4:
            base_score += 10
        if data.ndvi_index > 0.25:
            base_score += 5
            
        return min(100.0, max(0.0, base_score))

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
        ppi = ctrl.Consequent(np.arange(0, 101, 1), 'ppi')

        sev['low'] = fuzz.zmf(sev.universe, 2, 4)
        sev['high'] = fuzz.smf(sev.universe, 3, 5)
        
        rain.automf(3, names=['low', 'medium', 'high'])
        soil['dry'] = fuzz.zmf(soil.universe, 0.2, 0.5)
        soil['wet'] = fuzz.smf(soil.universe, 0.4, 0.8)
        
        crowd['few'] = fuzz.zmf(crowd.universe, 2, 10)
        crowd['many'] = fuzz.smf(crowd.universe, 5, 20)
        
        ppi.automf(3, names=['normal', 'warning', 'critical'])

        rule1 = ctrl.Rule(sev['high'] | crowd['many'], ppi['critical'])
        rule2 = ctrl.Rule(sev['low'] & soil['wet'] & rain['high'], ppi['warning'])
        rule3 = ctrl.Rule(sev['low'] & soil['dry'] & crowd['few'], ppi['normal'])
        rule4 = ctrl.Rule(rain['medium'], ppi['warning'])
        
        ppi_ctrl = ctrl.ControlSystem([rule1, rule2, rule3, rule4])
        return ctrl.ControlSystemSimulation(ppi_ctrl)

    def predict_ppi(self, data: RoadReportData) -> float:
        self.fuzzy_sim.input['severity'] = data.cv_max_severity_score
        self.fuzzy_sim.input['rainfall'] = data.rainfall_12m
        self.fuzzy_sim.input['soil'] = data.soil_moisture
        self.fuzzy_sim.input['crowd'] = data.crowd_count_30d
        self.fuzzy_sim.compute()
        return float(self.fuzzy_sim.output['ppi'])

# =====================================================================
# 3. Machine Learning Engine (รองรับการ Save/Load Pickle File)
# =====================================================================
class MLFusionEngine:
    def __init__(self, model_path="ppi_rf_model.pkl"):
        self.model_path = model_path
        self.model = None
        self._initialize_model()

    def _initialize_model(self):
        """ตรวจสอบว่ามีโมเดลเดิมอยู่ไหม ถ้ามีโหลดมาใช้ ถ้าไม่มีเทรนใหม่"""
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
            'cv_ratio': np.random.uniform(5, 80, n_samples),
            'cv_severity': np.random.choice([2, 4, 5], n_samples),
            'rain_12m': np.random.uniform(500, 2500, n_samples),
            'soil_moist': np.random.uniform(0.1, 0.8, n_samples),
            'ndvi': np.random.uniform(0.0, 0.8, n_samples),
            'is_asphalt': np.random.choice([1, 0], n_samples),
            'road_type_enc': np.random.uniform(1, 10, n_samples),
            'crowd_30d': np.random.randint(1, 30, n_samples),
            'comm_impact': np.random.uniform(10, 100, n_samples)
        })

        y_train = []
        for _, row in df.iterrows():
            mat = 'Asphalt' if row['is_asphalt'] == 1 else 'Concrete'
            mock_data = RoadReportData(
                row['cv_ratio'], row['cv_severity'], row['rain_12m'], 
                row['soil_moist'], row['ndvi'], mat, 
                row['road_type_enc'], row['crowd_30d'], row['comm_impact']
            )
            score = HeuristicFusionEngine.predict_ppi(mock_data) + np.random.normal(0, 5)
            y_train.append(min(100.0, max(0.0, score)))

        self.model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        self.model.fit(df, y_train)

        # บันทึกโมเดลลงไฟล์ .pkl
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
            'ndvi': [data.ndvi_index], 
            'is_asphalt': [is_asphalt],
            'road_type_enc': [data.road_type_encoded], 
            'crowd_30d': [data.crowd_count_30d],
            'comm_impact': [data.community_impact_score]
        })
        
        return float(self.model.predict(X_test)[0])

# =====================================================================
# Wrapper สำหรับเรียกใช้ง่ายๆ (Exported Objects)
# =====================================================================
# สร้าง Instance ไว้รอกันเลย เมื่อ Backend โหลดไฟล์นี้ โมเดลต่างๆ จะพร้อมใช้งาน
ml_engine = MLFusionEngine()
fuzzy_engine = FuzzyFusionEngine()
heuristic_engine = HeuristicFusionEngine()