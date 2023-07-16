module("luci.controller.circle", package.seeall)
local uci = require "luci.model.uci".cursor()

function index()

    entry({"admin", "network", "circle", "save_config"}, call("saveConfig"), nil)
    entry({"admin", "network", "circle", "get_config"}, call("getConfig"), nil)

end

-- 保存配置
function saveConfig()

    local startOpen = luci.http.formvalue('startOpen')
    local startTime = luci.http.formvalue('startTime')
    local conOpen = luci.http.formvalue('conOpen')
    local conTime = luci.http.formvalue('conTime')

    if startOpen and startTime and conOpen and conTime then
        uci:section('ipsec', 'circle', 'circle', {
            startOpen = startOpen,
            startTime = startTime,
            conOpen = conOpen,
            conTime = conTime
        });
        uci:commit('ipsec');
        luci.http.write_json({
            status = 'ok'
        })
    else
        luci.http.write_json({
            status = 'error',
            msg = '参数异常'
        })
    end
end 

-- 查询配置
function getConfig()

    local data = uci:get_all('ipsec', 'circle');
    if data then 
        luci.http.write_json({
            status = 'ok',
            data = data
        })
    else
        luci.http.write_json({
            status = 'error',
            msg = '查询错误'
        })
    end
end