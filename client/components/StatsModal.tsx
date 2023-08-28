import { Modal, Button, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { ReactEventHandler, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { JobStats } from '../../server/entities/Stats';
import { bytesToReadable, readableToBytes } from '../../server/utilities/Bytes';
import { FSNode } from '../../server/entities/FSNode';

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
  stats: JobStats[];
};

interface DataType {
  key: React.Key;
  path: string;
  jobId: string;
  timestamp: string;
  outTime: string;
  originalCodec: string;
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

  const getData = (): DataType[] => {
    return props.stats.map((stat: JobStats) => {
      console.log('stat', stat);
      return {
        key: stat.originalNode.path,
        path: stat.originalNode.path,
        jobId: stat.job.id,
        timestamp: stat.timestamp,
        outTime: stat.job.data.progress.out_time,
        originalCodec: stat.originalNode.streams[0].codec_name, // assume first is video,
        originalSize: stat.originalNode.size,
        newCodec: stat.newNode.streams[0].codec_name, // assume first is video,
        newSize: stat.newNode.size,
        spaceSaved: getSpaceSaved(stat.originalNode, stat.newNode),
      };
    });
  };

  const getSpaceSaved = (originalNode: FSNode, newNode: FSNode) => {
    const originalSize = readableToBytes(originalNode.size);
    const newSize = readableToBytes(newNode.size);
    return bytesToReadable(originalSize - newSize);
  };

  return (
    <Modal
      centered={true}
      width={'100%'}
      title={props.title}
      open={props.open}
      onOk={props?.onOk}
      onCancel={props.onCancel}
    >
      <Table
        columns={columns}
        dataSource={getData()}
        pagination={false}
        scroll={{ x: 2000, y: 500 }}
        bordered
        size="small"
      />
    </Modal>
  );
};
