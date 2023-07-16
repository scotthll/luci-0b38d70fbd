module("luci.controller.pki", package.seeall)
local fs = require("nixio.fs")
local uci = require "luci.model.uci".cursor()

function index()
	entry({"admin", "network", "pki", "ca_upload"}, call("caUpload"), nil)
	entry({"admin", "network", "pki", "key_status"}, call("keyStatus"), nil).leaf = true
	entry({"admin", "network", "pki", "csr_status"}, call("csrStatus"), nil).leaf = true
	entry({"admin", "network", "pki", "csr_gen"}, call("csrGen"), nil).leaf = true
	entry({"admin", "network", "pki", "key_gen"}, call("keyGen"), nil).leaf = true
	entry({"admin", "network", "pki", "key_del"}, call("keyDel"), nil).leaf = true
	entry({"admin", "network", "pki", "p12_enc"}, call("p12EncImport"), nil).leaf = true
	entry({"admin", "network", "pki", "p12_sign"}, call("p12SignImport"), nil).leaf = true
	entry({"admin", "network", "pki", "reset"}, call("onReset"), nil).leaf = true
	entry({"admin", "network", "pki", "get_cert_name"}, call("getCertName"), nil).leaf = true
	entry({"admin", "network", "pki", "has_ipsec"}, call("hasIpsec"), nil).leaf = true
	entry({"admin", "network", "pki", "pro_cert_upload"}, call("proCertUpload"), nil).leaf = true
end

-- 上传CA证书
function caUpload()
    local http    = require "luci.http"
    local basedir = '/etc_ipsec/swanctl/x509ca'
    local file  = http.formvalue("file")
    local fileName  = http.formvalue("fileName")
    local filePath   = basedir.. "/cacert.pem"

    if not fs.stat(basedir) then
		fs.mkdirr(basedir)
	end
    if file and fileName then
        local fp
        backupCert(basedir, 'cacert.pem', 'caName')
        http.setfilehandler(
            function(meta, chunk, eof)
				local data = chunk
				if not fp and meta and meta.name == "file" then
					fp = io.open(filePath, "w")
				end
				if fp and data then
					fp:write(data)
				end
				if fp and eof then
					fp:close()
                    http.write("ok")
                    uciSet('caName', fileName)
				end
            end
       )
    else
        http.write("error")
    end

end

-- 备份证书
function backupCert(basedir, fileName, key)

    local certName = uciGet(key);
    local path = basedir .. '/' .. fileName
    -- 内置证书存在 并且用户没上传证书
    if fs.stat(path) and not certName then
		os.execute('cp '..path.. ' '..  basedir.. '/back_'.. fileName)
    end

end    

-- 密钥状态
function keyStatus()
    local cmd = "/usr/libexec/ipsec_exec/exportkey"
    if not fs.stat(cmd) then
		luci.http.write('error')
    else

        local fh = io.popen(cmd)
        local strget = fh:read('*all')
        if string.match(strget, "SDF_ExportECCPubKey success.") then
           	luci.http.prepare_content("application/json")
           	luci.http.write('ok')
           else
           	luci.http.prepare_content("application/json")
           	luci.http.write('no')
        end
        fh:close()

	end

end

-- csr状态
function csrStatus()
    local cmd = "/usr/libexec/ipsec_exec/sign_csr.pem"
    if not fs.stat(cmd) then
		luci.http.prepare_content("application/json")
        luci.http.write('no')
    else
        luci.http.prepare_content("application/json")
        luci.http.write('ok')
    end

end

-- 生成CSR
function csrGen()
    local filePath = "/usr/libexec/ipsec_exec/gencsr_sdf"
    local name  = luci.http.formvalue("name")
    if not fs.stat(filePath) then
		luci.http.write('error')
    else

        local fh = io.popen(filePath.. ' 1 '..name)
        local strget = fh:read('*all')
        if string.match(strget, "SDF_ExportECCPubKey success.") then
            luci.http.write("ok")
            --修改后可注释
            os.execute("mv /usr/libexec/ipsec_exec/*sign_csr.pem  /luci-static/resources/view/pki/sign_csr.pem")

            uciSet('csrName', name)
        else
            luci.http.write("no")
        end
        fh:close()

	end

end

-- 生成密钥
function keyGen()
    local filePath = "/usr/libexec/ipsec_exec/genkeypair"
    if not fs.stat(filePath) then
		luci.http.write('error')
    else

        local fh = io.popen(filePath)
        local strget = fh:read('*all')
        if string.match(strget, "SM2 key: 2 create success.") then
            luci.http.write("ok")
            os.execute("rm /usr/libexec/ipsec_exec/sign_csr.pem")
        else
            luci.http.write("no")
        end
        fh:close()

	end

end

-- 删除密钥
function keyDel()
    local filePath = "/usr/libexec/ipsec_exec/destroykeypair"
    if not fs.stat(filePath) then
		luci.http.write('error')
    else
        local fh = io.popen(filePath)
        local strget = fh:read('*all')
        if string.match(strget, "SM2 key: 2 Destroy success.") then
            luci.http.write("ok")
            os.execute("rm /usr/libexec/ipsec_exec/*sign_csr.pem")
            os.execute("rm /luci-static/resources/view/pki/sign_csr.pem")
            uciDel('csrName')
        else
            luci.http.write("no")
        end
        fh:close()

	end

end

-- p12加密证书导入
function p12EncImport()
    local http    = require "luci.http"
    local basedir = '/usr/libexec/cert'
    local file  = http.formvalue("file")
    local pswd  = http.formvalue("pswd")
    local fileName  = http.formvalue("fileName")
    local filePath   = basedir.. "/temp_enc.p12"

    if not fs.stat(basedir) then
		fs.mkdirr(basedir)
	end

    if file and pswd and fileName then
        local fp
        -- local pswdOpen = io.open(basedir.. "/temp_enc.pswd", "w")
        -- pswdOpen:write(pswd)
        -- pswdOpen:close()
        backupCert(basedir, 'temp_enc.p12', 'encName')
        http.setfilehandler(
            function(meta, chunk, eof)
				local data = chunk
				if not fp and meta and meta.name == "file" then
					fp = io.open(filePath, "w")
				end
				if fp and data then
					fp:write(data)
				end
				if fp and eof then
					fp:close()
                    local isSuccess = parseCert(2, pswd)
                    if isSuccess then
                        uciSet('encName', fileName)
                        http.write("ok")
                    else 
                        http.write("error")
                    end
				end
            end
       )
    else
        http.write("error")
    end

end

-- TODO p12证书解析 
function parseCert(type, passwd)

    local fh = io.open('/usr/libexec/ipsec_exec/p12_port '.. type.. ' '.. passwd)
    local strget = fh:read('*all')
    if string.match(strget, "str") then
        fh:close()
        return true
    else
        fh:close()
        return false
    end
end    

-- p12签名证书导入
function p12SignImport()
    local http    = require "luci.http"
    local basedir = '/usr/libexec/cert'
    local file  = http.formvalue("file")
    local pswd  = http.formvalue("pswd")
    local fileName  = http.formvalue("fileName")
    local filePath   = basedir.. "/temp_sign.p12"

    if not fs.stat(basedir) then
		fs.mkdirr(basedir)
	end

    if file and pswd then
        local fp
        -- local pswdOpen = io.open(basedir.. "/temp_enc.pswd", "w")
        -- pswdOpen:write(pswd)
        -- pswdOpen:close()
        backupCert(basedir, 'temp_sign.p12', 'signName')
        http.setfilehandler(
            function(meta, chunk, eof)
				local data = chunk
				if not fp and meta and meta.name == "file" then
					fp = io.open(filePath, "w")
				end
				if fp and data then
					fp:write(data)
				end
				if fp and eof then
					fp:close()
                    local isSuccess = parseCert(1, pswd)
                    if isSuccess then
                        uciSet('signName', fileName)
                        http.write("ok")
                    else 
                        http.write("error")
                    end
				end
            end
       )
    else
        http.write("error")
    end

end

-- TODO 加密密钥保护结构上传
function proCertUpload()

    local http    = require "luci.http"
    local basedir = '/usr/libexec/cert'
    local file  = http.formvalue("file")
    local fileName  = http.formvalue("fileName")
    local filePath   = basedir.. "/pro_cert.crt"

    if not fs.stat(basedir) then
		fs.mkdirr(basedir)
	end
    if file and fileName then
        local fp
        backupCert(basedir, 'pro_cert.crt', 'proCertName')
        http.setfilehandler(
            function(meta, chunk, eof)
				local data = chunk
				if not fp and meta and meta.name == "file" then
					fp = io.open(filePath, "w")
				end
				if fp and data then
					fp:write(data)
				end
				if fp and eof then
					fp:close()
                    local isSuccess = parseProCert()
                    if isSuccess then
                        uciSet('proCertName', fileName)
                        http.write("ok")
                    else 
                        http.write("error")
                    end
				end
            end
       )
    else
        http.write("error")
    end

end    

-- TODO 密钥保护结构解析 
function parseProCert()

    local fh = io.open('.exe')
    local strget = fh:read('*all')
    if string.match(strget, "str") then
        fh:close()
        return true
    else
        fh:close()
        return false
    end

end    

-- 删除证书
function delCert()

    os.execute("rm /etc_ipsec/swanctl/x509ca/cacert.pem")
    os.execute("rm /usr/libexec/cert/temp_enc.p12")
    os.execute("rm /usr/libexec/cert/temp_sign.p12")
    uciDel('caName')
    uciDel('encName')
    uciDel('signName')
    uci:commit('pki')

end

-- 重置
function onReset()

    keyDel()
    delCert()

    uci:section('rpcd', 'dualAuth', 'dualAuth', {
        checked = '0'
    })
    ngnixConfig('0')
    uci:commit('rpcd')
    luci.http.write('ok')

end

-- 修改ngnix配置  关闭双重认证配置
function ngnixConfig(checked)
    local path = '/etc/nginx/nginx.conf'
    if fs.stat(path) then
        local status = 'off'
        if checked == '1' then
            status = 'on'
        end

        local file = io.open(path, "r") --Read 
        local lines = {} 
        for line in file:lines() do 
            if string.find(line,"ssl_verify_client") ~= nil then --Condition
                lines[#lines + 1] = 'ssl_verify_client '.. status.. ';' --Handle
            else 
                lines[#lines + 1] = line 
            end 
        end 
        file:close() 
     
        file = io.open(path, "w") --Write 
        for i, line in ipairs(lines) do 
            file:write(line, "\n") 
        end 
        file:close() 
        os.execute('/usr/sbin/nginx -s reload')
        return true
    else
        return false
    end
end

-- 获取上传的证书名称
function getCertName()

    local names = { status = "ok"}
    names['csrName'] = uciGet('csrName')
    names['caName'] = uciGet('caName')
    names['encName'] = uciGet('encName')
    names['signName'] = uciGet('signName')
    names['proCertName'] = uciGet('proCertName')
    luci.http.prepare_content("application/json")
    luci.http.write_json(names)

end

-- uci 设置值
function uciSet(key, value)

    uci:set('pki', 'pki', key, value)
    uci:commit('pki')

end

-- uci 获取值
function uciGet(key) 

    return uci:get('pki', 'pki', key)

end

-- uci 删除值
function uciDel(key)

    return uci:delete('pki', 'pki', key)
end

-- 获取ipsec是否存在
function hasIpsec()

    local has = uci:get_first('ipsec', 'connections');
    if has then
        luci.http.write('ok')
    else
        luci.http.write('error')
    end        

end    