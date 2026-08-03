import { useState } from "react";
import { Row, Col } from "antd";

import SummaryCards from "../components/admin-datavalidation/SummaryCards";
import VerificationFilter from "../components/admin-datavalidation/VerificationFilter";
import VerificationTable from "../components/admin-datavalidation/VerificationTable";
import AccuracyChart from "../components/admin-datavalidation/AccuracyChart";

export default function AIVerificationPage() {

  const [filters, setFilters] = useState({
    keyword: "",
    decision: undefined,
    status: undefined,
    confidence: [0, 100],
    dateRange: null,
  });

  return (
    <>
      <SummaryCards />

      <br />

      <VerificationFilter
        filters={filters}
        setFilters={setFilters}
      />

      <br />

      <Row gutter={16}>
        <Col span={17}>
          <VerificationTable
            filters={filters}
          />
        </Col>

        <Col span={7}>
          <AccuracyChart />
        </Col>
      </Row>
    </>
  );
}