import { Modal, Button, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { ReactEventHandler, useState } from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  root: {
    border: '1px solid #dee0e1',
    padding: 5,
    margin: 5,
    width: '100%',
    borderRadius: 2,
  },
});

type Props = {
  open: boolean;
  onCancel: any;
  onOk?: any;
  title: string;
  stats: any[];
};

interface DataType {
  key: React.Key;
  path: string;
  jobId: string;
  timestamp: string;
  outTime: string;
  originalCodec: number;
  originalSize: string;
  newCodec: string;
  newSize: string;
  spaceSaved: string;
}

const columns: ColumnsType<DataType> = [
  { title: 'Path', dataIndex: 'path', key: 'path' },
  { title: 'Job ID', dataIndex: 'jobId', key: 'jobId' },
  { title: 'Date', dataIndex: 'timestamp', key: 'timestamp' },
  { title: 'Duration', dataIndex: 'outTime', key: 'outTime' },
  { title: 'Original Codec', dataIndex: 'originalCodec', key: 'originalCodec' },
  { title: 'Original Size', dataIndex: 'originalSize', key: 'originalSize' },
  { title: 'New Codec', dataIndex: 'newCodec', key: 'newCodec' },
  { title: 'New Size', dataIndex: 'newSize', key: 'newSize' },
  { title: 'spaceSaved', dataIndex: 'spaceSaved', key: 'spaceSaved' },
];

export const StatsModal = (props: Props) => {
  const classes = useStyles();
  const [data, setData] = useState([]);

  return (
    <Modal
      centered={true}
      width={'100%'}
      title={props.title}
      open={props.open}
      onOk={props?.onOk}
      onCancel={props.onCancel}
    >
      <Table columns={columns} dataSource={data} size="small" />
    </Modal>
  );
};
