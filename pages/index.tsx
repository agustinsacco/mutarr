import type { NextPage } from 'next';
import React from 'react';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import request from 'superagent';
import { createUseStyles } from 'react-jss';
import { FSNode } from '../server/entities/FSNode';
import { FileExplorer } from '../client/components/FileExplorer';
import { ActiveNode } from '../client/components/ActiveNode';
import { Col, Row, Card, Divider, Typography, Skeleton, Statistic, Button } from 'antd';
import { message } from 'antd';
import getConfig from 'next/config';
import { Key } from 'antd/es/table/interface';
import { QueueJobs } from '../client/components/QueueJobs';
import { JobCollection } from '../server/entities/JobCollection';
import { Job } from 'bullmq';
import { bytesToReadable } from '../server/utilities/Bytes';
import { extractNumbersFromString } from '../server/utilities/String';
import { isFileSupported } from '../server/utilities/Video';

const { publicRuntimeConfig } = getConfig();

const { Title } = Typography;

const origin =
  typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
const socket = io(origin);

const useStyles = createUseStyles({});

const Home: NextPage = () => {
  const classes = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const [isPaused, setIsPaused] = useState(false);
  const [nodes, setNodes] = useState();
  const [jobStats, setJobStats] = useState([]);
  const [jobStatsLoading, setJobStatsLoading] = useState(false);
  const [bulkTranscodeLoading, setBulkTranscodeLoading] = useState(false);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobs, setJobs] = useState<JobCollection>({
    active: [],
    delayed: [],
    completed: [],
    failed: [],
    waiting: [],
  });
  const [currentNode, setCurrentNode] = useState<FSNode>();
  const [selectedNodes, setSelectedNodes] = useState([]);

  const onMount = async (): Promise<void> => {
    socket.on('connect', () => {
      console.log('Socket is connected!');
    });

    socket.on('jobUpdate', (updatedJob: Job) => {
      console.log('jobUpdate socket fired', updatedJob);
      setJobs({
        ...jobs,
        active:
          jobs.active.length > 0
            ? jobs.active.map((job: Job) => {
                if (job.id === updatedJob.id) {
                  return updatedJob;
                }
                return job;
              })
            : [updatedJob],
      });
    });
    socket.on('jobsRefresh', (jobs: JobCollection) => {
      console.log('jobsRefresh socket fired', jobs);
      setJobs(jobs);
    });
    socket.on('nodesRefresh', (nodesUpdate) => {
      console.log('nodesRefresh socket fired');
      setNodes(nodesUpdate);
    });
    // Get nodes
    getNodes();
    // Get status
    getJobStats();
    // Get jobs
    getJobs();
    // Get status
    getStatus();
  };

  useEffect(() => {
    onMount();
    return () => {
      unMount();
    };
  }, []);

  const getJobs = async () => {
    setJobsLoading(true);
    const jobsRsp = (await request.get('/queue/jobs'))?.body;
    if (jobsRsp) {
      setJobs(jobsRsp);
    }
    setJobsLoading(false);
  };

  const getNodes = async () => {
    setNodesLoading(true);
    const nodes = (await request.get('/nodes'))?.body;
    if (nodes) {
      setNodes(nodes);
    }
    setNodesLoading(false);
  };

  const getJobStats = async () => {
    setJobStatsLoading(true);
    const stats = (await request.get('/queue/jobs/stats'))?.body;
    if (stats) {
      setJobStats(stats);
    }
    setJobStatsLoading(false);
  };

  const handleNodeClick = async (selectedKeys: Key[]) => {
    const path = selectedKeys[0]; // Only handling 1 key at a time.
    const fileNode = (await request.get(`/nodes?path=${encodeURIComponent(path)}`))
      ?.body[0];
    if (fileNode) {
      setCurrentNode(fileNode);
    } else {
      messageApi.open({
        type: 'error',
        content: `Was not able to find streams for node: "${path}"`,
      });
    }
  };

  const unMount = (): void => {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('pong');
  };

  const handleNodesChecked = async (nodes: FSNode[]) => {
    console.log('handleNodesChecked');
    const filteredNodes = nodes.filter((node) => {
      if (isFileSupported(node.path)) {
        return node;
      }
    });
    setSelectedNodes(filteredNodes);
  };

  const handleNodesCheckedSubmit = async () => {
    setBulkTranscodeLoading(true);
    for (const node of selectedNodes) {
      await request.post('/queue/jobs').send(node);
      messageApi.open({
        type: 'success',
        content: `Job has been queued`,
      });
    }
    setBulkTranscodeLoading(false);
    setSelectedNodes([]);
  };

  const handleNodesCheckedClear = async () => {
    setSelectedNodes([]);
  };

  const handleAddJob = async (node: FSNode) => {
    await request.post('/queue/jobs').send(node);
    messageApi.open({
      type: 'success',
      content: `Job has been queued`,
    });
  };
  const handleRemoveJob = async (id: string) => {
    await request.delete(`/queue/jobs/${id}`);
    messageApi.open({
      type: 'warning',
      content: `Job ${id} has been stopped and removed`,
    });
  };
  const handlePauseQueue = async () => {
    await request.post('/queue/pause');
    messageApi.open({
      type: 'loading',
      content: `Jobs are paused`,
    });
    setIsPaused(true);
  };
  const handleResumeQueue = async () => {
    await request.post('/queue/resume');
    messageApi.open({
      type: 'success',
      content: `Jobs are running`,
    });
    setIsPaused(false);
  };
  const getStatus = async () => {
    const statusRsp = (await request.get('/queue/status')).body;
    setIsPaused(statusRsp.isPaused);
  };

  const getTotalSpaceSaved = () => {
    let total = 0; // Base is MB
    for (const jobStat of jobStats) {
      const originalSize = +extractNumbersFromString(jobStat.originalNode.size);
      const newSize = +extractNumbersFromString(jobStat.newNode.size);
      total = total + (originalSize - newSize);
    }
    const bytes = total * 1024 * 1024; // Total kb for jobs
    return bytesToReadable(bytes);
  };

  const getAverageSpaceSaved = () => {
    let total = 0; // Base is MB
    for (const jobStat of jobStats) {
      const originalSize = +extractNumbersFromString(jobStat.originalNode.size);
      const newSize = +extractNumbersFromString(jobStat.newNode.size);
      total = total + (originalSize - newSize);
    }
    const bytes = (total * 1024 * 1024) / jobStats.length; // Avg kb per job
    return bytesToReadable(bytes);
  };
  return (
    <>
      {contextHolder}
      <Row justify="center" align="stretch" gutter={16}>
        <Col span={24} style={{ marginBottom: 20 }}>
          <Row gutter={16}>
            <Col>
              <Card bordered={false}>
                <Statistic title="Transcodes completed" value={jobStats.length} />
              </Card>
            </Col>
            <Col>
              <Card bordered={false}>
                <Statistic title="Total space saved" value={getTotalSpaceSaved()} />
              </Card>
            </Col>
            <Col>
              <Card bordered={false}>
                <Statistic title="Average saved" value={getTotalSpaceSaved()} />
              </Card>
            </Col>
          </Row>
        </Col>
        <Col span={6}>
          <QueueJobs
            loading={jobsLoading}
            jobs={jobs}
            isPaused={isPaused}
            onPauseQueue={handlePauseQueue}
            onResumeQueue={handleResumeQueue}
            onRemoveJob={handleRemoveJob}
          />
        </Col>
        <Col span={18} style={{ width: '100%', height: '100%' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}>
            <Col>
              <Title level={5} style={{ margin: 0 }}>
                File Explorer
              </Title>
            </Col>
          </Row>
          <Card style={{ width: '100%', height: '100%' }}>
            <Row gutter={16}>
              <Col xs={24} lg={16}>
                {nodesLoading ? (
                  <>
                    <Skeleton style={{ padding: 20 }} active />
                    <Skeleton style={{ padding: 20 }} active />
                    <Skeleton style={{ padding: 20 }} active />
                  </>
                ) : (
                  <FileExplorer
                    nodes={nodes}
                    node={currentNode}
                    onCheck={handleNodesChecked}
                    onClick={handleNodeClick}
                    checkedKeys={selectedNodes.map((node) => node.path)}
                    onCheckedSubmit={handleNodesCheckedSubmit}
                    onCheckedClear={handleNodesCheckedClear}
                    onCheckedLoading={bulkTranscodeLoading}
                  />
                )}
              </Col>
              <Col xs={24} lg={8} style={{ paddingRight: 20 }}>
                <Row>
                  {currentNode && (
                    <>
                      <Col span={24}>
                        <ActiveNode
                          onConvert={handleAddJob}
                          node={currentNode}
                          jobs={[].concat(jobs?.active, jobs?.waiting)}
                        />
                      </Col>
                      <Divider plain />
                    </>
                  )}
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      {/* <SettingsModal open={settingsModalOpen} onCancel={} onOk={() => setSettingsModalOpen(false)} /> */}
    </>
  );
};

export default Home;
