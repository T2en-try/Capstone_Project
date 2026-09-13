import {
    Button,
    Col,
    DatePicker,
    Input,
    Row,
    Select,
} from "antd";

import {
    ReloadOutlined,
    SearchOutlined,
} from "@ant-design/icons";

const COLORS = {
    text: "#1F2937",
    secondary: "#64748B",
    border: "#E5E7EB",
};

const FilterBar = ({
    filters,
    onChange,
}) => {
    /* =========================================================
       UPDATE FILTER
    ========================================================= */

    const updateFilter = (
        key,
        value
    ) => {
        onChange({
            ...filters,
            [key]: value,
        });
    };

    /* =========================================================
       RESET
    ========================================================= */

    const resetFilters = () => {
        onChange({
            keyword: "",
            status: "all",
            priority: "all",
            province: "all",
            dateRange: null,
        });
    };

    return (
        <div
            style={{
                width: "100%",
            }}
        >
            <Row
                gutter={[12, 12]}
                align="middle"
            >
                {/* =================================================
                    SEARCH
                ================================================= */}

                <Col
                    xs={24}
                    sm={12}
                    md={8}
                >
                    <Input
                        allowClear
                        prefix={
                            <SearchOutlined
                                style={{
                                    color:
                                        COLORS.secondary,
                                }}
                            />
                        }
                        placeholder="ค้นหา Report ID / ชื่อถนน"
                        value={
                            filters.keyword ||
                            ""
                        }
                        onChange={(e) =>
                            updateFilter(
                                "keyword",
                                e.target
                                    .value
                            )
                        }
                        style={{
                            height: 38,
                            borderRadius: 7,
                        }}
                    />
                </Col>

                {/* =================================================
                    STATUS
                   
                    มาจาก report_action
                ================================================= */}

                <Col
                    xs={12}
                    sm={6}
                    md={4}
                >
                    <Select
                        allowClear
                        style={{
                            width: "100%",
                            height: 38,
                        }}
                        placeholder="สถานะ"
                        value={
                            filters.status ===
                            "all"
                                ? undefined
                                : filters.status
                        }
                        onChange={(value) =>
                            updateFilter(
                                "status",
                                value ||
                                    "all"
                            )
                        }
                        options={[
                            {
                                value:
                                    "pending",
                                label:
                                    "รอดำเนินการ",
                            },
                            {
                                value:
                                    "processing",
                                label:
                                    "กำลังดำเนินการ",
                            },
                            {
                                value:
                                    "completed",
                                label:
                                    "เสร็จสิ้น",
                            },
                            {
                                value:
                                    "rejected",
                                label:
                                    "ปฏิเสธ",
                            },
                        ]}
                    />
                </Col>

                {/* =================================================
                    PRIORITY
                   
                    3 Critical
                    2 Warning
                    1 Good
                ================================================= */}

                <Col
                    xs={12}
                    sm={6}
                    md={4}
                >
                    <Select
                        allowClear
                        style={{
                            width: "100%",
                            height: 38,
                        }}
                        placeholder="ระดับความสำคัญ"
                        value={
                            filters.priority ===
                            "all"
                                ? undefined
                                : filters.priority
                        }
                        onChange={(value) =>
                            updateFilter(
                                "priority",
                                value ||
                                    "all"
                            )
                        }
                        options={[
                            {
                                value:
                                    "Critical",
                                label:
                                    "Critical",
                            },
                            {
                                value:
                                    "Warning",
                                label:
                                    "Warning",
                            },
                            {
                                value:
                                    "Good",
                                label:
                                    "Good",
                            },
                        ]}
                    />
                </Col>

                {/* =================================================
                    PROVINCE
                   
                    ai_gis_context.admin_province
                   
                    Database:
                    จังหวัดนครราชสีมา
                ================================================= */}

                <Col
                    xs={12}
                    sm={6}
                    md={4}
                >
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{
                            width: "100%",
                            height: 38,
                        }}
                        placeholder="จังหวัด"
                        value={
                            filters.province ===
                            "all"
                                ? undefined
                                : filters.province
                        }
                        onChange={(value) =>
                            updateFilter(
                                "province",
                                value ||
                                    "all"
                            )
                        }
                        options={[
                            {
                                value:
                                    "จังหวัดนครราชสีมา",
                                label:
                                    "จังหวัดนครราชสีมา",
                            },
                        ]}
                    />
                </Col>

                {/* =================================================
                    DATE RANGE
                ================================================= */}

                <Col
                    xs={24}
                    sm={12}
                    md={4}
                >
                    <DatePicker.RangePicker
                        style={{
                            width: "100%",
                            height: 38,
                        }}
                        value={
                            filters.dateRange
                        }
                        onChange={(value) =>
                            updateFilter(
                                "dateRange",
                                value
                            )
                        }
                        placeholder={[
                            "วันที่เริ่มต้น",
                            "วันที่สิ้นสุด",
                        ]}
                    />
                </Col>

                {/* =================================================
                    RESET
                ================================================= */}

                <Col
                    xs={24}
                    sm={12}
                    md={4}
                >
                    <Button
                        icon={
                            <ReloadOutlined />
                        }
                        onClick={
                            resetFilters
                        }
                        style={{
                            width: "100%",
                            height: 38,
                            borderRadius: 7,
                            color:
                                COLORS.text,
                            borderColor:
                                COLORS.border,
                        }}
                    >
                        ล้างตัวกรอง
                    </Button>
                </Col>
            </Row>
        </div>
    );
};

export default FilterBar;