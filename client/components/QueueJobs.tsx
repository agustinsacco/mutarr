import { Button, Card, Col, Row, Spin, Typography } from "antd";
import classNames from "classnames";
import React from "react";
import { createUseStyles } from "react-jss";
import { bytesToReadable } from "../../server/utilities/Bytes";
import { JobCollection } from "../../server/entities/JobCollection";
import { Box } from "./Box";
import {
  CheckCircleOutlined,
  CloseSquareOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
} from "@ant-design/icons";
import { Job } from "bullmq";

const { Text, Title } = Typography;

const useStyles = createUseStyles({
  root: {},
});

type Props = {
  children?: JSX.Element | JSX.Element[];
  className?: any;
  jobs: JobCollection;
  onResumeQueue: Function;
  onPauseQueue: Function;
  onRemoveJob: Function;
};

export const QueueJobs = (props: Props) => {
  const classes = useStyles();

  const displayJobs = (jobs: Job[], status: string) => {
    if (jobs && jobs.length > 0) {
      return (
        <Row>
          {jobs.map((job: Job) => {
            return (
              <Col key={job.id} span={24}>
                <Box>
                  <Row justify="space-between">
                    <Col>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        Job # {job.id}
                        {status == "active" && (
                          <LoadingOutlined style={{ marginLeft: 10 }} />
                        )}
                        {status == "failed" && (
                          <ExclamationCircleOutlined
                            style={{ marginLeft: 10, color: "red" }}
                          />
                        )}
                        {status == "completed" && (
                          <CheckCircleOutlined
                            style={{ marginLeft: 10, color: "green" }}
                          />
                        )}
                      </Typography.Title>
                    </Col>
                    <Col>
                      <CloseSquareOutlined
                        onClick={() => props.onRemoveJob(job.id.toString())}
                      />
                    </Col>
                  </Row>
                  <Text
                    strong
                    style={{ marginTop: 5, marginBottom: 10, fontSize: 12 }}
                  >
                    {job.data?.path}
                  </Text>
                  {job?.data?.progress && (
                    <Row style={{ margin: 3 }}>
                      <Col span={12}>
                        <Row>
                          <Text style={{ fontSize: 12 }}>
                            <Text underline>fps:</Text> {job.data.progress.fps}
                          </Text>
                        </Row>
                        <Row>
                          <Text style={{ fontSize: 12 }}>
                            <Text underline>bitrate:</Text>{" "}
                            {job.data.progress.bitrate}
                          </Text>
                        </Row>
                        <Row>
                          <Text style={{ fontSize: 12 }}>
                            <Text underline>out time:</Text>{" "}
                            {job.data.progress.out_time}
                          </Text>
                        </Row>
                      </Col>
                      <Col span={12}>
                        <Row>
                          <Text style={{ fontSize: 12 }}>
                            <Text underline>size:</Text>{" "}
                            {bytesToReadable(job.data.progress.total_size)}
                          </Text>
                        </Row>
                        <Row>
                          <Text style={{ fontSize: 12 }}>
                            <Text underline>speed:</Text>{" "}
                            {job.data.progress.speed}
                          </Text>
                        </Row>
                        <Row>
                          <Text style={{ fontSize: 12 }}>
                            <Text underline>drop frame:</Text>{" "}
                            {job.data.progress.drop_frames}
                          </Text>
                        </Row>
                      </Col>
                    </Row>
                  )}
                </Box>
              </Col>
            );
          })}
        </Row>
      );
    }
  };

  return (
    <div className={classNames(classes.root, props.className)}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}>
        <Col>
          <Title level={5} style={{ margin: 0 }}>
            Conversion Jobs
          </Title>
        </Col>
        <Col>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={() => props.onResumeQueue()}
          />
          <Button
            icon={<PauseOutlined />}
            onClick={() => props.onPauseQueue()}
          />
        </Col>
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Card size="small" title="Active Jobs">
            {props?.jobs?.active && props.jobs.active.length > 0 ? (
              displayJobs(props.jobs.active, "active")
            ) : (
              <Text>No active jobs</Text>
            )}
          </Card>
        </Col>
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Card size="small" title="Failed Jobs">
            {props?.jobs?.failed && props.jobs.failed.length > 0
              ? displayJobs(props.jobs.failed, "failed")
              : "No failed jobs"}
          </Card>
        </Col>
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Card size="small" title="Complete Jobs">
            {props?.jobs?.completed && props?.jobs?.completed.length > 0
              ? displayJobs(props.jobs.completed, "completed")
              : "No completed jobs"}
          </Card>
        </Col>
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Card size="small" title="Waiting Jobs">
            {props?.jobs?.waiting && props?.jobs?.waiting.length > 0
              ? displayJobs(props.jobs.waiting, "waiting")
              : "No jobs waiting"}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
