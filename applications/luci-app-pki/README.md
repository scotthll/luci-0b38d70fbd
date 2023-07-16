#### 证书管理

#### 源码路径

    /feeds/luci/applications/luci-app-user

#### hs芯片没有密钥对时：

1. 删除密钥：
root@ZJKJ:~# ./destroykeypair 
open device success!
open session success!
SDF_ImportRootKeyAndDeviceSN : 0x1000003
SN: hs_0000000000001
CosVer: 4.3.11
SM2 key: 1 not exists
SM2 key: 2 not exists
SDF_CloseSession success.
SDF_CloseDevice success.

2. 状态查询：
root@ZJKJ:~# ./exportkey 
open device success!
open session success!
SN: hs_0000000000001
CosVer: 4.3.11
SDF_ExportECCPubKey failed: 0X1000003
SDF_CloseSession success.
SDF_CloseDevice success.

3. 生成密钥对：
root@ZJKJ:~# ./genkeypair 
open device success!
open session success!
SDF_ImportRootKeyAndDeviceSN : 0x1000003
SN: hs_0000000000001
CosVer: 4.3.11
SM2 key: 1 create success.
SM2 key: 2 create success.
SDF_CloseSession success.
SDF_CloseDevice success.

4. 生成证书请求csr：
root@ZJKJ:~# ./gencsr_sdf 1 lcc
open device success!
open session success!
SN: hs_0000000000001
CosVer: 4.3.11
SDF_ExportECCPubKey failed: 0X1000003
SDF_CloseSession success.
SDF_CloseDevice success.


#### hs芯片有密钥对时：

1. 删除密钥
root@ZJKJ:~# ./destroykeypair 
open device success!
open session success!
SDF_ImportRootKeyAndDeviceSN : 0x1000003
SN: hs_0000000000001
CosVer: 4.3.11
SM2 key: 1 exists
SM2 key: 1 Destroy success.
SM2 key: 2 exists
SM2 key: 2 Destroy success.
SDF_CloseSession success.
SDF_CloseDevice success.

2. 查询状态
root@ZJKJ:~# ./exportkey 
open device success!
open session success!
SN: hs_0000000000001
CosVer: 4.3.11
index: 1, pubkey:
7a 34 30 ee 2a 57 47 43 c0 e7 1a f2 de 27 65 65 
e6 a1 da 2d 68 6a 1f 3f c6 05 f4 9c 4a 13 17 30 
a0 6d 6a 30 5c e1 a7 71 4c 1a 71 3d 28 5d 33 a7 
59 97 24 7e 22 13 21 99 0f db 4b 4b 01 c1 a2 8b 
SDF_ExportECCPubKey success.
index: 2, pubkey:
da a7 ff f6 8e f6 ae 78 fc d3 81 ca 45 0f 50 02 
25 7d a1 e7 04 07 ce 73 78 70 50 3d d5 33 0b 26 
93 99 8f 83 d7 1b 9a bb d7 c3 e6 76 47 40 bf 76 
d5 39 2a 9c 5f 52 ef 96 10 18 08 49 70 1d de c9 
SDF_ExportECCPubKey success.
SDF_CloseSession success.
SDF_CloseDevice success.

3. 生成密钥
root@ZJKJ:~# ./genkeypair 
open device success!
open session success!
SDF_ImportRootKeyAndDeviceSN : 0x1000003
SN: hs_0000000000001
CosVer: 4.3.11
SM2 key: 1 exists
SM2 key: 2 exists
SDF_CloseSession success.
SDF_CloseDevice success.

#### 依赖于有密钥对存在：

1 签名密钥    
2 加密密钥

1. 生成csr证书
root@ZJKJ:~# ./gencsr_sdf 1 lcc
open device success!
open session success!
SN: hs_0000000000001
CosVer: 4.3.11
index: 1, pubkey:
d2 57 ba ac 74 d3 a0 1c 94 9e bf 56 d5 e9 84 00 
1e ed 79 78 e7 15 fa 46 c7 28 39 ea 29 7d ca 5c 
2e d9 3f 08 ef 0c 5a 9a 09 69 ea b4 31 66 bb b9 
72 d2 55 37 84 a6 60 b7 93 f2 64 79 08 d9 a7 75 
SDF_ExportECCPubKey success.
get x: 
D257BAAC74D3A01C949EBF56D5E984001EED7978E715FA46C72839EA297DCA5C
y: 
2ED93F08EF0C5A9A0969EAB43166BBB972D2553784A660B793F2647908D9A775
set pubkey: 1
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoEcz1UBgi0DQgAE0le6rHTToByUnr9W1emEAB7teXjn
FfpGxyg56il9ylwu2T8I7wxamglp6rQxZru5ctJVN4SmYLeT8mR5CNmndQ==
-----END PUBLIC KEY-----
write pub: 1
check key: 1
data:
30 81 d3 02 01 00 30 71 31 0b 30 09 06 03 55 04 
06 13 02 43 4e 31 0b 30 09 06 03 55 04 08 0c 02 
62 6a 31 0b 30 09 06 03 55 04 07 0c 02 68 64 31 
0b 30 09 06 03 55 04 0a 0c 02 7a 6a 31 11 30 0f 
06 03 55 04 0b 0c 08 6e 65 74 5f 73 61 66 65 31 
0c 30 0a 06 03 55 04 03 0c 03 6c 63 63 31 1a 30 
18 06 09 2a 86 48 86 f7 0d 01 09 01 16 0b 6c 67 
79 40 31 32 36 2e 63 6f 6d 30 59 30 13 06 07 2a 
86 48 ce 3d 02 01 06 08 2a 81 1c cf 55 01 82 2d 
03 42 00 04 d2 57 ba ac 74 d3 a0 1c 94 9e bf 56 
d5 e9 84 00 1e ed 79 78 e7 15 fa 46 c7 28 39 ea 
29 7d ca 5c 2e d9 3f 08 ef 0c 5a 9a 09 69 ea b4 
31 66 bb b9 72 d2 55 37 84 a6 60 b7 93 f2 64 79 
08 d9 a7 75 a0 00 
HashData:
14 57 9f c2 ce 8a 53 41 ed 2c 89 50 2d ec 41 ca 
17 d4 4b ea eb 86 41 e4 e7 97 b6 4e c1 35 94 11 
Signature:
f0 92 74 1b de 02 17 ec 6b b8 5c 51 67 59 63 08 
d1 50 f4 d3 8c 29 2b 05 35 a4 04 52 60 1f 25 3d 
f5 68 5c bd 14 86 f6 be 49 11 96 f3 b5 46 89 2d 
da 4b 00 3b d5 85 eb e7 bd 94 f6 11 f9 67 55 6b 
sign:
30 46 02 21 00 f0 92 74 1b de 02 17 ec 6b b8 5c 
51 67 59 63 08 d1 50 f4 d3 8c 29 2b 05 35 a4 04 
52 60 1f 25 3d 02 21 00 f5 68 5c bd 14 86 f6 be 
49 11 96 f3 b5 46 89 2d da 4b 00 3b d5 85 eb e7 
bd 94 f6 11 f9 67 55 6b 
req:
30 82 01 2f 30 81 d3 02 01 00 30 71 31 0b 30 09 
06 03 55 04 06 13 02 43 4e 31 0b 30 09 06 03 55 
04 08 0c 02 62 6a 31 0b 30 09 06 03 55 04 07 0c 
02 68 64 31 0b 30 09 06 03 55 04 0a 0c 02 7a 6a 
31 11 30 0f 06 03 55 04 0b 0c 08 6e 65 74 5f 73 
61 66 65 31 0c 30 0a 06 03 55 04 03 0c 03 6c 63 
63 31 1a 30 18 06 09 2a 86 48 86 f7 0d 01 09 01 
16 0b 6c 67 79 40 31 32 36 2e 63 6f 6d 30 59 30 
13 06 07 2a 86 48 ce 3d 02 01 06 08 2a 81 1c cf 
55 01 82 2d 03 42 00 04 d2 57 ba ac 74 d3 a0 1c 
94 9e bf 56 d5 e9 84 00 1e ed 79 78 e7 15 fa 46 
c7 28 39 ea 29 7d ca 5c 2e d9 3f 08 ef 0c 5a 9a 
09 69 ea b4 31 66 bb b9 72 d2 55 37 84 a6 60 b7 
93 f2 64 79 08 d9 a7 75 a0 00 30 0c 06 08 2a 81 
1c cf 55 01 83 75 05 00 03 49 00 30 46 02 21 00 
f0 92 74 1b de 02 17 ec 6b b8 5c 51 67 59 63 08 
d1 50 f4 d3 8c 29 2b 05 35 a4 04 52 60 1f 25 3d 
02 21 00 f5 68 5c bd 14 86 f6 be 49 11 96 f3 b5 
46 89 2d da 4b 00 3b d5 85 eb e7 bd 94 f6 11 f9 
67 55 6b 
r: 1
SDF_CloseSession success.
SDF_CloseDevice success.

#### 导出csr证书名称
csr_name:sign_csr.pem

#### P12证书
名称：PKCS#12  格式
##### 上传P12证书路径和名称
p12证书导入需要口令
p12证书路径  /usr/libexec/cert
加密证书 temp_enc.p12
签名证书 temp_sign.p12
##### 解析P12证书

    exec('p12_port type(1: 签名密钥 2：加密密钥) password')

