import { Table, Tag, Progress, Button, Dropdown, Space } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import priorityReportMock from "../../mock/priorityReportMock";


const ReportsTable = () => {

  const navigate = useNavigate();


  const getPriorityColor = (score) => {
    if (score >= 90) return "#ff4d4f";
    if (score >= 70) return "#fa8c16";
    if (score >= 50) return "#faad14";
    return "#52c41a";
  };


  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "gold";

      case "Processing":
        return "blue";

      case "Completed":
        return "green";

      default:
        return "default";
    }
  };


  const menuItems = (record) => [
    {
      key: "1",
      label: "View Detail",
      onClick: () => {
        navigate(`/admin/reports/${record.id}`);
      },
    },
    {
      key: "2",
      label: "Assign Engineer",
    },
    {
      key: "3",
      label: "Mark as Completed",
    },
  ];



  const columns = [

    {
      title: "Report ID",
      dataIndex: "reportId",
      key: "reportId",
      width: 140,
    },


    {
      title: "Road",
      dataIndex: "roadName",
      key: "roadName",
    },


    {
      title: "Damage",
      dataIndex: "damageType",
      key: "damageType",
      width: 140,
    },


    {
      title: "Priority",
      dataIndex: "priorityScore",
      key: "priorityScore",
      width: 180,

      render: (score) => (

        <Space
          direction="vertical"
          size={2}
          style={{
            width:"100%"
          }}
        >

          <strong>
            {score}
          </strong>


          <Progress
            percent={score}
            showInfo={false}
            strokeColor={getPriorityColor(score)}
          />

        </Space>

      ),
    },


    {
      title: "GEE",
      dataIndex: "gee",
      key:"gee",
      width:120,

      render:(gee)=>(

        <Progress
          percent={gee}
          size="small"
        />

      ),
    },


    {
      title:"Status",
      dataIndex:"status",
      key:"status",
      width:140,

      render:(status)=>(

        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>

      )
    },


    {
      title:"Reported Date",
      dataIndex:"reportDate",
      key:"reportDate",
      width:150,
    },


    {
      title:"",
      key:"action",
      width:70,
      align:"center",


      render:(_,record)=>(

        <Dropdown
          menu={{
            items:menuItems(record)
          }}
          trigger={["click"]}
        >

          <Button
            type="text"
            icon={<MoreOutlined />}
          />

        </Dropdown>

      )
    }

  ];



  return (

    <Table

      rowKey="id"

      columns={columns}

      dataSource={priorityReportMock}


      pagination={{
        pageSize:8,
        showSizeChanger:false,
      }}

    />

  );

};


export default ReportsTable;