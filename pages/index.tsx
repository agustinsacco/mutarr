import type { NextPage } from 'next';
import React from 'react';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import request from 'superagent';
import { createUseStyles } from 'react-jss';
import { FSNode } from '../server/entities/FSNode';
import { FileExplorer } from '../client/components/FileExplorer';
import { ActiveNode } from '../client/components/ActiveNode';
import { Col, Row, Card, Divider, Typography, Skeleton } from 'antd';
import { message } from 'antd';
import getConfig from 'next/config';
import { Key } from 'antd/es/table/interface';
import { QueueJobs } from '../client/components/QueueJobs';
import { JobCollection } from '../server/entities/JobCollection';
import { NodeStats } from '../client/components/NodeStats';
import { Job } from 'bullmq';
const { publicRuntimeConfig } = getConfig();

const { Title } = Typography;

const origin =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';
const socket = io(origin);

const useStyles = createUseStyles({});

const Home: NextPage = () => {
  const classes = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const [isPaused, setIsPaused] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [nodes, setNodes] = useState();
  const [nodeStats, setNodeStats] = useState();
  const [nodesLoading, setNodesLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobs, setJobs] = useState<JobCollection>({
    active: [],
    delayed: [],
    completed: [],
    failed: [],
    waiting: [],
  });
  const [currentNode, setCurrentNode] = useState<FSNode>();

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
                console.log(job.id, updatedJob.id);
                if (job.id === updatedJob.id) {
                  return updatedJob;
                }
                return job;
              })
            : [updatedJob],
      });
      console.log({
        ...jobs,
        active: jobs.active.map((job: Job) => {
          if (job.id === updatedJob.id) {
            return updatedJob;
          }
          return job;
        }),
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
    // getNodeStats();
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

  const getNodeStats = async () => {
    setStatsLoading(true);
    const stats = (await request.get('/nodes/stats'))?.body;
    if (stats) {
      setNodeStats(stats);
    }
    setStatsLoading(false);
  };

  const handleNodeClick = async (selectedKeys: Key[]) => {
    const path = selectedKeys[0]; // Only handling 1 key at a time.
    const fileNode = (
      await request.get(`/nodes?path=${encodeURIComponent(path)}`)
    )?.body[0];
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

  const handleBulkConvert = async (nodes: FSNode[]) => {
    console.log('handleBulkConvert');
    console.log(nodes);
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
  return (
    <>
      {contextHolder}
      <Row
        justify="center"
        align="stretch"
        gutter={16}
        style={{ width: '100%', height: '100%' }}
      >
        <Col span={6}>
          <QueueJobs
            jobs={jobs}
            onPauseQueue={handlePauseQueue}
            onResumeQueue={handleResumeQueue}
            onRemoveJob={handleRemoveJob}
          />
        </Col>
        <Col span={18} style={{ width: '100%', height: '100%' }}>
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: 10, marginLeft: 5 }}
          >
            <Col>
              <Title level={5} style={{ margin: 0 }}>
                File Explorer
              </Title>
            </Col>
          </Row>
          <Card style={{ width: '100%', height: '100%', overflow: 'scroll' }}>
            <Row>
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
                    onBulkCheckSubmit={handleBulkConvert}
                    onClick={handleNodeClick}
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
                  <Col span={24}>
                    <Title level={5} style={{ margin: 0, marginBottom: 10 }}>
                      Statistics
                    </Title>
                    {statsLoading ? (
                      <Skeleton
                        style={{ padding: 20 }}
                        loading={statsLoading}
                        active
                      />
                    ) : (
                      <>
                        <NodeStats stats={nodeStats} />
                        <Divider plain />
                      </>
                    )}
                  </Col>
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
