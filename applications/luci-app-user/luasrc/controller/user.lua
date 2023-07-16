module("luci.controller.user", package.seeall)
local uci = require "luci.model.uci".cursor()
local fs = require("nixio.fs")

function index()

    entry({"admin", "system", "user", 'dual_auth'}, call("dualAuth"), nil)
    entry({"admin", "system", "user", 'dual_auth_checked'}, call("dualAuthChecked"), nil)

end

-- 开启双重认证
function dualAuth()
    local checked = luci.http.formvalue('checked')
    if checked then
        if checked == '1' and not hasCert() then
            luci.http.write_json({
                status = 'error',
                msg = '请先完善PKI配置'
            })
            return
        end
        local isSuccess = ngnixConfig(checked)
        if isSuccess then
            uci:section('rpcd', 'dualAuth', 'dualAuth', {
                checked = checked
            })
            uci:commit('rpcd')
            luci.http.write_json({
                status = 'ok'
            })
        else
            luci.http.write_json({
                status = 'error',
                msg = '服务器配置异常！'
            })
        end        
    else
        luci.http.write_json({
            status = 'error',
            msg = '参数不正确！'
        })
    end

end

-- 修改ngnix配置  双重认证配置
function ngnixConfig(checked)
    local path = '/etc/nginx/nginx.conf'
    if fs.stat(path) then
        local status = 'off'
        if checked == '1' then
            status = 'on'
        end

        local file = io.open(path, "r") --Read 
        local lines = {}
        local hasOpt = false
        for line in file:lines() do 
            if string.find(line,"ssl_verify_client") ~= nil then --Condition
                hasOpt = true
                lines[#lines + 1] = 'ssl_verify_client '.. status.. ';' --Handle
            else 
                lines[#lines + 1] = line 
            end 
        end 
        file:close() 
     
        if hasOpt then
            file = io.open(path, "w") --Write 
            for i, line in ipairs(lines) do 
                file:write(line, "\n") 
            end 
            file:close() 
            os.execute('/usr/sbin/nginx -s reload')
            return true
        end    
        return false
    else
        return false
    end
end

-- 获取是否选中状态
function dualAuthChecked()

    local checked = uci:get('rpcd', 'dualAuth', 'checked')
    if not checked then
        checked = '0'
    end

    luci.http.write_json({
        status = 'ok',
        checked = checked
    })

end


-- 查询是否上传证书
function hasCert()

    local caName = uciGet('caName');
    local encName = uciGet('encName');
    local signName = uciGet('signName');
    -- 还需要判断密钥和密钥保护结构的情况
    if caName and encName and signName then
        return true
    end    
    return false

end    
-- 获取证书名称
function uciGet(key) 
    return uci:get('ca', 'ca', key)
end