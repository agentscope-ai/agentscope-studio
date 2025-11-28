# OpenTelemetry Proto to TypeScript Generator

# 1. Clone the OpenTelemetry proto files:

git clone https://github.com/open-telemetry/opentelemetry-proto.git opentelemetry-proto

# 2. Generate TypeScript files:

npm install protoc-gen-ts
CURRENT_PATH=$(pwd)
PROJECT_PATH="${CURRENT_PATH}/../../../../"

protoc \
    --plugin="${PROJECT_PATH}/node_modules/.bin/protoc-gen-ts"  \
    --ts_out="${CURRENT_PATH}/" \
    --ts_opt=esModuleInterop=true \
    --ts_opt=stringEnums=true \
    --proto_path=./opentelemetry-proto/ \
    opentelemetry-proto/opentelemetry/proto/common/v1/*.proto \
    opentelemetry-proto/opentelemetry/proto/resource/v1/*.proto \
    opentelemetry-proto/opentelemetry/proto/trace/v1/*.proto    \
    opentelemetry-proto/opentelemetry/proto/collector/trace/v1/*.proto    \

# 3. Clean up OpenTelemetry proto files:

rm -rf opentelemetry-proto
