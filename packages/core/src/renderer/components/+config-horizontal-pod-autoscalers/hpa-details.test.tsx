/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import React from "react";
import { HorizontalPodAutoscaler, HpaMetricType } from "../../../common/k8s-api/endpoints";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import type { DiRender } from "../test-utils/renderFor";
import { renderFor } from "../test-utils/renderFor";
import { HpaDetails } from "./hpa-details";

jest.mock("react-router-dom", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const hpaV2 = {
  apiVersion: "autoscaling/v2",
  kind: "HorizontalPodAutoscaler",
  metadata: {
    name: "hpav2",
    resourceVersion: "1",
    uid: "hpav2",
    namespace: "default",
    selfLink: "/apis/autoscaling/v2/namespaces/default/horizontalpodautoscalers/hpav2",
  },
  spec: {
    maxReplicas: 10,
    scaleTargetRef: {
      kind: "Deployment",
      name: "hpav2deployment",
      apiVersion: "apps/v1",
    },
  },
};

describe("<HpaDetails/>", () => {
  let result: RenderResult;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders", () => {
    const hpa = new HorizontalPodAutoscaler(hpaV2);

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.baseElement).toMatchSnapshot();
  });

  it("does not show metrics table if no metrics found", () => {
    const hpa = new HorizontalPodAutoscaler(hpaV2);

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.queryByTestId("hpa-metrics")).toBeNull();
  });

  it("shows proper metric name for autoscaling/v1", () => {
    const hpa = new HorizontalPodAutoscaler({
      apiVersion: "autoscaling/v1",
      kind: "HorizontalPodAutoscaler",
      metadata: {
        name: "hpav1",
        resourceVersion: "1",
        uid: "hpav1",
        namespace: "default",
        selfLink: "/apis/autoscaling/v1/namespaces/default/horizontalpodautoscalers/hpav1",
      },
      spec: {
        maxReplicas: 10,
        scaleTargetRef: {
          kind: "Deployment",
          name: "hpav1deployment",
          apiVersion: "apps/v1",
        },
        targetCPUUtilizationPercentage: 80,
      },
    });

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("CPU Utilization percentage")).toBeInTheDocument();
  });

  it("shows proper metric name for container resource metrics", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.ContainerResource,
              containerResource: {
                name: "cpu",
                container: "nginx",
                target: {
                  type: "Utilization",
                  averageUtilization: 60,
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("Resource cpu on Pods")).toBeInTheDocument();
  });

  it("shows proper metric name for resource metrics", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50,
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("Resource cpu on Pods")).toBeInTheDocument();
  });

  it("shows proper metric name for pod metrics for hpa v2", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Pods,
              pods: {
                metric: {
                  name: "packets-per-second",
                },
                target: {
                  type: "AverageValue",
                  averageValue: "1k",
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("packets-per-second on Pods")).toBeInTheDocument();
  });

  it("shows proper metric name for pod metrics for hpa v2beta1", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Pods,
              pods: {
                metricName: "packets-per-second",
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("packets-per-second on Pods")).toBeInTheDocument();
  });

  it("shows proper metric name for object metrics for hpa v2", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Object,
              object: {
                metric: {
                  name: "requests-per-second",
                },
                target: {
                  type: "Value",
                  value: "10k",
                },
                describedObject: {
                  kind: "Service",
                  name: "nginx",
                  apiVersion: "v1",
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText(/requests-per-second/)).toHaveTextContent("requests-per-second onService/nginx");
  });

  it("shows proper metric name for object metrics for hpa v2beta1", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Object,
              object: {
                metricName: "requests-per-second",
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("requests-per-second")).toBeInTheDocument();
  });

  it("shows proper metric name for external metrics for hpa v2", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.External,
              external: {
                metric: {
                  name: "queue_messages_ready",
                  selector: {
                    matchLabels: { queue: "worker_tasks" },
                  },
                },
                target: {
                  type: "AverageValue",
                  averageValue: "30",
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("queue_messages_ready on {\"matchLabels\":{\"queue\":\"worker_tasks\"}}")).toBeInTheDocument();
  });

  it("shows proper metric name for external metrics for hpa v2beta1", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.External,
              external: {
                metricName: "queue_messages_ready",
                metricSelector: {
                  matchLabels: { queue: "worker_tasks" },
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.getByText("queue_messages_ready on {\"matchLabels\":{\"queue\":\"worker_tasks\"}}")).toBeInTheDocument();
  });

  it("shows unknown metrics with lack of metric type", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            // @ts-ignore
            {
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50,
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.baseElement).toMatchSnapshot();
  });

  it("shows unknown metrics with with unusual type", () => {
    const hpa = new HorizontalPodAutoscaler(
      {
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              // @ts-ignore
              type: "Unusual",
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50,
                },
              },
            },
          ],
        },
      },
    );

    result = render(
      <HpaDetails object={hpa} />,
    );

    expect(result.baseElement).toMatchSnapshot();
  });
});
