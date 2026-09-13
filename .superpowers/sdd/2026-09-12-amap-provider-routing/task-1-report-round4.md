# Task 1 修复报告（第 4 轮）

## 修改文件

- `server/src/nest/maps/maps.service.ts`
  - 在 MapsService 面向 controller 的 `search`、`details`、`detailsExpanded` wrapper 中，显式调用 shared 的 `mapPlaceProjectionSchema` 进行 provider-neutral allowlist projection。
  - provider service object 不再直接作为 public REST JSON 返回；Zod 默认 strip 会移除 provider-only 字段。
  - 保留既有 Google/OSM 兼容字段，包括 Google/OSM identity、name/address/lat/lng、rating、website/phone，以及详情页使用的 opening/review/navigation 字段。
- `shared/src/maps/maps.schema.ts`
  - 将 projection 导出为 `mapPlaceProjectionSchema` / `MapPlaceProjection`，并补齐既有详情兼容字段，作为 server boundary 的唯一 projection contract。
- `server/tests/unit/nest/maps.service.test.ts`
  - 新增 search、Google details、OSM expanded details 的服务层测试，直接断言 provider-only 字段不在实际 wrapper 返回值中。

## 验证命令

- `npm install --ignore-scripts`：通过；环境 Node `20.20.0`，依赖报告存在既有 engine warnings 和 27 个 audit vulnerabilities。
- `npm run build --workspace=shared`：通过。
- `npm run typecheck --workspace=server`：通过。
- `npm run test --workspace=server -- maps.service.test.ts maps.controller.test.ts`：maps service tests 通过（228 tests）；controller suite 因本 worktree 的 `better-sqlite3` native binding 缺失而无法启动，属于环境依赖问题，不是测试断言失败。
- `git diff --check`：通过。

## 已知风险

- controller 测试仍需在安装了匹配当前 Node/平台的 `better-sqlite3` native binding 环境中重跑。
- projection 继续保留当前客户端详情所需的合法兼容字段；未实现 AMap adapter 或 forwarding，也未改变 REST envelope/status/error 行为。
