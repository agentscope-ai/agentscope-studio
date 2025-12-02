# Observability and Tracing

AgentScope Studio offers intuitive observability and tracing for AI applications. It provides users with immediate insights into key metrics, such as inputs, outputs, tool calls, execution time, errors, and costs.

AgentScope Studio's observability is built on [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) and [OTLP protocol](https://opentelemetry.io/docs/specs/otlp/). It natively ingests observability data from AgentScope while also supporting data from any collection tool or AI framework compatible with OpenTelemetry or LoongSuite.

![Trace](./assets/tracing_detail_chat_history.png)

As an AI application developer, you can:

- Accelerate development and debugging by understanding context construction and propagation.
- Capture essential data for application evaluation and fine-tuning.
- Pinpoint the root cause of errors and exceptions.
- Identify performance bottlenecks to optimize latency.
- Track and manage model API costs.

As an observability component developer, you can:

- Painlessly deploy a turnkey visualization backend for AI observability.
- Validate the semantic integrity and compliance of observability data.
- Build and scale custom observability services ready for production environments.

## Page Introduction and Core Features

You can find the Trace page entry in the Studio left toolbar.

### Overview Page

On this page, you can see basic information about all trace data reported to Studio over a period of time. Key metrics such as call count, total token consumption, and average latency are aggregated and displayed on the overview page.

> 💡 **Tip**: Hover over the icon after the trace name to view basic metadata of that trace, such as Trace ID.

![Trace](./assets/tracing_overview.png)

### Detail Page

Click on any trace in the overview page, and you can view the call sequence and call relationships of this trace on the left. Further select calls at different levels, and you can see the detailed context when these calls occurred.

In the Metadata area, you can see the input and output of calls. For AI-related calls, such as LLM, Agent, etc., inputs and outputs are displayed according to the [structure](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/#recording-content-on-attributes) defined by OpenTelemetry semantic conventions. For regular calls, such as Function, Format, etc., inputs and outputs follow AgentScope extended [semantic conventions](#agentscope-extended-conventions) for display.

![Trace](./assets/tracing_detail_chat_history.png)

In the All Attributes area, you can see all key metadata of this call, with naming following [semantic conventions](#semantic-conventions).

![Trace](./assets/tracing_detail_attributes.png)

## Semantic Conventions

AgentScope Studio's observability data follows semantic conventions based on [OpenTelemetry](#opentelemetry-generative-ai). Data following these semantic conventions will be processed and displayed more accurately and clearly in Studio. To make it more convenient for you to use Studio, it is necessary to ensure that your semantic conventions follow the conventions described in this document as much as possible.

> 💡 **Tip**: AgentScope library's native observability capabilities already follow these semantic conventions. Even if your observability data from other sources does not currently follow these semantic conventions, trace data can still be displayed normally, but some key information may not be highlighted/specifically displayed.

### OpenTelemetry Generative AI

OpenTelemetry provides a set of semantic convention standards for observability data of Generative AI applications. For detailed definitions, see [Semantic conventions for generative client AI spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) and [Semantic Conventions for GenAI agent and framework spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/).

> 💡 **Tip**: The OpenTelemetry semantic convention version currently followed by Studio is 1.38.0.

The semantic conventions currently followed include:

- [**Inference**](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/#inference): model calls
- [**Invoke agent span**](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/#invoke-agent-span): agent calls
- [**Execute tool span**](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/#execute-tool-span): toolkit calls

### AgentScope Extended Conventions

In addition to various semantic conventions defined in OpenTelemetry, to display the call process more clearly, AgentScope has extended semantic conventions for some specific call processes.

#### Common Calls

Applicable to all key call processes that occur in AI applications.

| Key                          | [Requirement Level](https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/) | Value Type | Description                                   | Example Values                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentscope.function.name`   | `Recommended`                                                                                         | string     | The name of the method/function being called. | `DashScopeChatModel.__call__`; `ToolKit.callTool`                                                                                                                                                                                                                                                                                                                                             |
| `agentscope.function.input`  | `Opt-In`                                                                                              | string     | The input of the method/function.[1]          | {<br/>&nbsp;&nbsp;"tool_call": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;"type": "tool_use",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"id": "call_83fce0d1d2684545a13649",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"name": "multiply",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"input": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"a": 5,<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"b": 3<br/>&nbsp;&nbsp;&nbsp;&nbsp;}<br/>&nbsp;&nbsp;}<br/>} |
| `agentscope.function.output` | `Opt-In`                                                                                              | string     | The return value of the method/function.[2]   | `ToolResponse(content=[{'type': 'text', 'text': '5 × 3 = 15'}], metadata=None, stream=False, is_last=True, is_interrupted=False, id='2025-11-28 00:38:52.733_cc4ead')`                                                                                                                                                                                                                        |

**[1] `agentscope.function.input`**: Method/function input parameters. **Must** be serialized in JSON format.

**[2] `agentscope.function.output`**: The return value of the method/function. Serialized in JSON or toString format.

#### Format Calls

This span represents the preparation and formatting process of requests before initiating model calls. In AgentScope, this method corresponds to the call of the Formatter tool.

`gen_ai.operation.name` **should** be `format`.

**Span name should** be `format {agentscope.format.target}`.

**Span kind should** be `INTERNAL`.

**Span status should** follow the [Recording Errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/) documentation.

**Attributes:**

| Key                          | [Requirement Level](https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/) | Value Type | Description                                                                               | Example Values                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gen_ai.operation.name`      | `Required`                                                                                            | string     | The name of the operation being performed.                                                | `chat`; `generate_content`; `text_completion`                                                                                                                                                                                                                                                                                                                                                 |
| `error.type`                 | `Conditionally Required` if the operation ended in an error                                           | string     | The error thrown when the operation was aborted.                                          | `timeout`; `java.net.UnknownHostException`; `server_certificate_invalid`; `500`                                                                                                                                                                                                                                                                                                               |
| `agentscope.format.target`   | `Required`                                                                                            | string     | The target type to format to. If the target type cannot be resolved, set it to 'unknown'. | `dashscope`; `openai`                                                                                                                                                                                                                                                                                                                                                                         |
| `agentscope.format.count`    | `Recommended`                                                                                         | int        | The actual number of messages formatted.[1]                                               | `3`                                                                                                                                                                                                                                                                                                                                                                                           |
| `agentscope.function.name`   | `Recommended`                                                                                         | string     | The name of the method/function being called.                                             | `DashScopeChatModel.__call__`; `ToolKit.callTool`                                                                                                                                                                                                                                                                                                                                             |
| `agentscope.function.input`  | `Opt-In`                                                                                              | string     | The input of the method/function.[2]                                                      | {<br/>&nbsp;&nbsp;"tool_call": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;"type": "tool_use",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"id": "call_83fce0d1d2684545a13649",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"name": "multiply",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"input": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"a": 5,<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"b": 3<br/>&nbsp;&nbsp;&nbsp;&nbsp;}<br/>&nbsp;&nbsp;}<br/>} |
| `agentscope.function.output` | `Opt-In`                                                                                              | string     | The return value of the method/function.[3]                                               | `ToolResponse(content=[{'type': 'text', 'text': '5 × 3 = 15'}], metadata=None, stream=False, is_last=True, is_interrupted=False, id='2025-11-28 00:38:52.733_cc4ead')`                                                                                                                                                                                                                        |

**[1] `agentscope.format.count`**: The actual number of messages formatted. The value is consistent with the size of the message list returned after the formatting function execution. If truncation or message cropping occurred during formatting, this value may be smaller than the size of the input message list.

**[2] `agentscope.function.input`**: Method/function input parameters. **Must** be serialized in JSON format.

**[3] `agentscope.function.output`**: The return value of the method/function. Serialized in JSON or toString format.

#### Function Calls

This span represents the process of initiating any key call. In AgentScope, this method corresponds to the execution process of regular functions, and it only takes effect when users add tracing capabilities to methods/functions through the methods provided by AgentScope.

`gen_ai.operation.name` **should** be `invoke_generic_function`.

**Span name should** be `invoke_generic_function {agentscope.function.name}`.

**Span kind should** be `INTERNAL`.

**Span status should** follow the [Recording Errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/) documentation.

**Attributes:**

| Key                          | [Requirement Level](https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/) | Value Type | Description                                      | Example Values                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gen_ai.operation.name`      | `Required`                                                                                            | string     | The name of the operation being performed.       | `chat`; `generate_content`; `text_completion`                                                                                                                                                                                                                                                                                                                                                 |
| `error.type`                 | `Conditionally Required` if the operation ended in an error                                           | string     | The error thrown when the operation was aborted. | `timeout`; `java.net.UnknownHostException`; `server_certificate_invalid`; `500`                                                                                                                                                                                                                                                                                                               |
| `agentscope.function.name`   | `Recommended`                                                                                         | string     | The name of the method/function being called.    | `DashScopeChatModel.__call__`; `ToolKit.callTool`                                                                                                                                                                                                                                                                                                                                             |
| `agentscope.function.input`  | `Opt-In`                                                                                              | string     | The input of the method/function.[1]             | {<br/>&nbsp;&nbsp;"tool_call": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;"type": "tool_use",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"id": "call_83fce0d1d2684545a13649",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"name": "multiply",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"input": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"a": 5,<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"b": 3<br/>&nbsp;&nbsp;&nbsp;&nbsp;}<br/>&nbsp;&nbsp;}<br/>} |
| `agentscope.function.output` | `Opt-In`                                                                                              | string     | The return value of the method/function.[2]      | `ToolResponse(content=[{'type': 'text', 'text': '5 × 3 = 15'}], metadata=None, stream=False, is_last=True, is_interrupted=False, id='2025-11-28 00:38:52.733_cc4ead')`                                                                                                                                                                                                                        |

**[1] `agentscope.function.input`**: Method/function input parameters. **Must** be serialized in JSON format.

**[2] `agentscope.function.output`**: The return value of the method/function. Serialized in JSON or toString format.

## Integration

AgentScope Studio provides services compliant with the [OpenTelemetry Protocol (OTLP)](https://opentelemetry.io/docs/specs/otlp/) specification.

By default, after AgentScope Studio starts, it exposes the following service endpoints:

- **OTLP/Trace/gRPC**: `localhost:4317`, you can adjust the gRPC service endpoint by modifying the `OTEL_GRPC_PORT` environment variable.
- **OTLP/Trace/HTTP**: `localhost:3000`, you can adjust the HTTP service endpoint by modifying the `PORT` environment variable.

> 💡 **Tip**: Studio currently only supports receiving Trace type data.

### AgentScope Application Integration

The AgentScope framework natively supports the collection and export of Trace data. You can add some additional code in your application to implement Trace data reporting.

#### AgentScope Python Application

Add the following initialization code before your application code.

```python
import agentscope

agentscope.init(studio_url="http://localhost:3000") # Replace this with Studio's HTTP service endpoint

# your application code
```

#### AgentScope Java Application

1. Add the dependency required to connect to Studio in your project.

maven:

```xml
<dependency>
  <groupId>io.agentscope</groupId>
  <artifactId>agentscope-extensions-studio</artifactId>
</dependency>
```

gradle:

```gradle
implementation("io.agentscope:agentscope-extensions-studio")
```

2. Add the following initialization code before your application code.

```Java
public static void main() {
  StudioManager.init()
    .studioUrl("http://localhost:3000")
    .initialize()
    .block();

  // your application code
}
```

### LoongSuite/OpenTelemetry Agent Integration

LoongSuite agents are non-intrusive observability data collection tools for multi-language AI applications developed by Alibaba Cloud's cloud-native team based on OpenTelemetry agents. These agents implement non-intrusive observability through code instrumentation by completing code enhancement mechanisms at compile time/runtime.

The data collected by LoongSuite agents and OpenTelemetry agents are all exported using OTLP Exportor, so they can be directly received and stored by AgentScope Studio. Currently supported agents include:

- [LoongSuite Python Agent](https://github.com/alibaba/loongsuite-python-agent)
- [LoongSuite Go Agent](https://github.com/alibaba/loongsuite-go-agent)
- [LoongSuite Java Agent](https://github.com/alibaba/loongsuite-java-agent)
- [OpenTelemetry Python Agent](https://github.com/open-telemetry/opentelemetry-python-contrib)
- [OpenTelemetry Java Agent](https://github.com/open-telemetry/opentelemetry-java-instrumentation)
- [OpenTelemetry JavaScript Agent](https://github.com/open-telemetry/opentelemetry-js-contrib)
- ...(any other data collectors that support OTLP Exporter)

#### LoongSuite Python Agent Integration

1. Refer to the [LoongSuite Python Agent official documentation](https://github.com/alibaba/loongsuite-python-agent/tree/main/instrumentation-loongsuite/loongsuite-instrumentation-agentscope) to install the agent
2. Modify startup parameters to export data to AgentScope Studio, please replace `exporter_otlp_endpoint` with your Studio's gRPC service address

```shell
loongsuite-instrument \
    --traces_exporter otlp \
    --metrics_exporter console \
    --service_name your-service-name \
    --exporter_otlp_endpoint 0.0.0.0:4317 \
    python myapp.py
```

#### OpenTelemetry Java Agent Integration

1. Refer to the [OpenTelemetry Java Agent official documentation](https://github.com/open-telemetry/opentelemetry-java-instrumentation) to install the agent
2. Modify startup parameters to export data to AgentScope Studio, please replace `otel.exporter.otlp.traces.endpoint` with your Studio's gRPC service address

```shell
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -Dotel.resource.attributes=service.name=your-service-name \
     -Dotel.traces.exporter=otlp \
     -Dotel.metrics.exporter=console \
     -Dotel.exporter.otlp.traces.endpoint=http://localhost:4317 \
     -jar myapp.jar
```

### Advanced Integration: Import Custom Trace Data

If you need to export observability data from any source as trace data to AgentScope Studio, you can assemble the data according to the [OTLP protocol](https://opentelemetry.io/docs/specs/otlp/). AgentScope Studio receives trace data encoded in Protobuf format and provides both HTTP and gRPC services. The service exposure methods follow [OTLP/HTTP](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service_http.yaml) and [OTLP/gRPC](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service.proto) conventions respectively, and the data body follows [OTLP Protobuf](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto) definitions.

#### Using OTLP Exporter to Export Data

To ensure data correctness, it is strongly recommended that you use OTLP Exporter for data export. You can find more detailed tutorials in the [OTLP official documentation](https://opentelemetry.io/docs/specs/otel/protocol/exporter/). The following is an example of OTLP Exporter in Python:

> 💡 **Tip**: This section is partially referenced from [OpenTelemetry Python API](https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html).

Create OTLP Exporter and initialize TracerProvider:

```Python
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
    OTLPSpanExporter,
)

tracer_provider = TracerProvider()
# OTLP/HTTP for OpenTelemetry Python SDK by default
exporter = OTLPSpanExporter(endpoint="http://localhost:3000")
span_processor = BatchSpanProcessor(exporter)
tracer_provider.add_span_processor(span_processor)
```

Use TracerProvider to create Tracer and build Span:

```Python
# create tracer
tracer = tracer_provider.get_tracer("test_module", "1.0.0")

# create span
# attributes maybe set here
with tracer.start_as_current_span("test") as span:
    try:
        # do something
        # attributes may be set here
        span.set_attributes({"test_key": "test_value"})
        span.set_status(trace_api.StatusCode.OK)
        return res

    except Exception as e:
        span.set_status(
            trace_api.StatusCode.ERROR,
            str(e),
        )
        span.record_exception(e)
        raise e from None
```
