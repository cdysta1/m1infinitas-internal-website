### Appwrite 发布配置

使用 Node 22、入口 main.mjs、函数 ID project-interactions。仅允许 Users 执行，动态 API key 需要 users.read 和 documents.write。DATABASE_ID 默认为 m1_internal。收藏量按已有账户偏好去重汇总，仅返回项目 ID 和人数。

在同一数据库创建 project_submissions 集合，开启文档级权限，集合级权限留空。添加必填字符串 sender_id、recipient_id、project_id（各 36）、project_title（80），以及必填 Mediumtext 字段 snapshot。为 sender_id、recipient_id 分别建立 key 索引。函数根据已登录账号和项目记录确定收发双方，写入只读快照，同一账号对同一项目的重复投递返回成功且保留首次内容。收件箱按接收者查询，项目删除后仍保留投递时的标题。

本地演示使用浏览器存储，生产使用上述函数和数据库。
