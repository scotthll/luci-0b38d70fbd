'use strict';
'require view';
'require dom';
'require fs';
'require ui';
'require uci';
'require form';
'require tools.widgets as widgets';
'require request';
var aclList = {};

var baseUrl = '/cgi-bin/luci/admin/system/user';

var roles = {
    '1': '系统管理员',
    '2': '安全管理员',
    '3': '审计管理员',
};

var baseRole = [
    // 基础
    "allow-full-uci-access",
    "luci-base",
    "unauthenticated",
    // 状态
    "luci-mod-status-index",
    "luci-mod-status-index-dhcp",
    "luci-mod-status-index-dsl",
    "luci-mod-status-index-wifi"
];

// TODO 角色权限数据
var getRoleData = function (role) {
    var roleData = {
        '1': [
            ...baseRole,
            // 状态
            "luci-mod-status-processes",
            // 系统
            "luci-mod-system-config",
            "luci-app-user",
            "luci-mod-system-cron",
            "luci-mod-system-flash",
            "luci-mod-system-init",
            "luci-mod-system-mounts",
            "luci-mod-system-reboot",
            "luci-mod-system-ssh",
            "luci-mod-system-uhttpd",
            // 网络
            "luci-app-pki",
            "luci-base-network-status",
            "luci-mod-network-config",
            "luci-mod-network-dhcp",

        ],
        '2': [
            ...baseRole,
            // 状态
            "luci-mod-status-routes",
            "luci-mod-status-firewall",
            // 系统
            "luci-mod-system-reboot",
            // 服务
            "luci-app-clamav",
            // 网络
            "luci-app-pki",
            "luci-base-network-status",
            "luci-mod-network-config",
            "luci-mod-network-diagnostics",
            "luci-app-firewall",
            "luci-app-ipsec",
        ],
        '3': [
            ...baseRole,
            // 状态
            "luci-mod-status-logs",
            "luci-mod-status-realtime",
        ]
    };
    return roleData[role];
};

// 设置角色权限
var setRole = function (section_id, role) {

    var value = getRoleData(role);

    uci.unset('rpcd', section_id, 'read');
    uci.unset('rpcd', section_id, 'write');

    if (Array.isArray(value)) {
        uci.set('rpcd', section_id, 'read', value);
    }
    if (Array.isArray(value)) {
        uci.set('rpcd', section_id, 'write', value);
    }
};

// 校验密码
var checkPassword = function (section_id, value, variant, has_uhttpd) {
    var startStr = value.substring(0, 3);
    switch (startStr) {
        case '$p$':
            return _('The password may not start with "$p$".');
        case '$1$':
            variant.getUIElement(section_id).setValue('crypted');
            break;
        default:
            if (variant.formvalue(section_id) == 'crypted' && value.length && !has_uhttpd) {
                return _('Cannot encrypt plaintext password since uhttpd is not installed.');
            } else {
                var strongRegex = /^(?!([A-Z]*|[a-z]*|[0-9]*|[!-/:-@\[-`{-~]*|[A-Za-z]*|[A-Z0-9]*|[A-Z!-/:-@\[-`{-~]*|[a-z0-9]*|[a-z!-/:-@\[-`{-~]*|[0-9!-/:-@\[-`{-~]*)$)[A-Za-z0-9!-/:-@\[-`{-~]{8,20}$/;
                if (!strongRegex.test(value)) {
                    return '请输入正确的密码，格式包含字母、数字、特殊字符，长度不少于8位';
                }
            };
    }
    return true;
};

// 禁用组件
var disabledComponent = function (section_id, key) {

    setTimeout(() => {
        if (uci.get('rpcd', section_id, 'sys') == '1') {
            var removeEle = document.querySelector(`#cbi-rpcd-${section_id} .cbi-section-actions .cbi-button-remove`);
            removeEle.style.visibility = 'hidden';
        }
        var ele = document.getElementById(`widget.cbid.rpcd.${section_id}.${key}`);
        if (!ele) return;
        if (uci.get('rpcd', section_id, 'username')) {
            ele.setAttribute('disabled', '');
        } else {
            ele.removeAttribute('disabled');
        }
    });
};

return view.extend({

    load: function () {
        var that = this;
        return L.resolveDefault(fs.list('/usr/share/rpcd/acl.d'), []).then(function (entries) {
            var tasks = [
                L.resolveDefault(fs.stat('/usr/sbin/uhttpd'), null),
                fs.lines('/etc/passwd'),
                that.getAuthChecked()
            ];

            for (var i = 0; i < entries.length; i++)
                if (entries[i].type == 'file' && entries[i].name.match(/\.json$/))
                    tasks.push(L.resolveDefault(fs.read('/usr/share/rpcd/acl.d/' + entries[i].name).then(JSON.parse)));

            return Promise.all(tasks);
        });
    },

    render: async function (data) {
        this.hideNotiEvent();
        var has_uhttpd = data[0],
            known_unix_users = {};

        for (var i = 0; i < data[1].length; i++) {
            var parts = data[1][i].split(/:/);

            if (parts.length >= 7)
                known_unix_users[parts[0]] = true;
        }

        for (var i = 3; i < data.length; i++) {
            if (!L.isObject(data[i]))
                continue;

            for (var aclName in data[i]) {
                if (!data[i].hasOwnProperty(aclName))
                    continue;

                aclList[aclName] = data[i][aclName];
            }
        }

        var m, s, o;

        m = new form.Map('rpcd', '');

        s = m.section(form.GridSection, 'login');
        s.anonymous = true;
        s.addremove = true;


        s.modaltitle = function (section_id) {
            return _('LuCI Logins') + ' » ' + (uci.get('rpcd', section_id, 'username') || _('New account'));
        };

        o = s.option(form.Value, 'username', _('Login name'));
        o.rmempty = false;
        o.cfgvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'username') || '';
            disabledComponent(section_id, 'username');
            return value;
        };

        o = s.option(form.ListValue, '_variant', _('Password variant'));
        o.modalonly = true;
        o.value('shadow', _('Use UNIX password in /etc/shadow'));
        o.value('crypted', '自定义密码');
        o.cfgvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'password') || '';
            if (value.substring(0, 3) == '$p$')
                return 'shadow';
            else
                return 'crypted';
        };
        o.write = function () { };

        o = s.option(widgets.UserSelect, '_account', _('UNIX account'), _('The system account to use the password from'));
        o.modalonly = true;
        o.depends('_variant', 'shadow');
        o.cfgvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'password') || '';
            return value.substring(3);
        };
        o.write = function (section_id, value) {
            uci.set('rpcd', section_id, 'password', '$p$' + value);
        };
        o.remove = function () { };

        o = s.option(form.Value, 'password', _('Password value'));
        o.modalonly = true;
        o.password = true;
        o.rmempty = false;
        o.depends('_variant', 'crypted');
        o.cfgvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'password') || '';
            return (value.substring(0, 3) == '$p$') ? '' : value;
        };

        o.validate = function (section_id, value) {
            var variant = this.map.lookupOption('_variant', section_id)[0];
            return checkPassword(section_id, value, variant, has_uhttpd);
        };
        o.write = async function (section_id, value) {
            var variant = this.map.lookupOption('_variant', section_id)[0];
            if (variant.formvalue(section_id) == 'crypted' && value.substring(0, 3) != '$1$') {
                console.log('has value', value);
                return fs.exec('/usr/sbin/uhttpd', ['-m', value]).then(function (res) {
                    console.log('uhttpd -m then', res);
                    if (res.code == 0 && res.stdout) {
                        uci.set('rpcd', section_id, 'password', res.stdout.trim());
                    } else {
                        console.log('uhttpd -m then error');
                        throw new Error(res.stderr);
                    }
                }).catch(function (err) {
                    alert('error: ' + err.message);
                    console.log('Unable to encrypt plaintext password', err.message, err.stack);
                    throw new Error(_('Unable to encrypt plaintext password: %s').format(err.message));
                });
            }
            uci.set('rpcd', section_id, 'password', value);
        };
        o.remove = function () { };

        o = s.option(form.Value, 'timeout', _('Session timeout'));
        o.default = '300'; // session timeout unit is seconds
        o.datatype = 'uinteger';
        o.readonly = true;
        o.textvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'timeout') || this.default;
            return +value ? '%ds'.format(value) : E('em', [_('does not expire')]);
        };

        o = s.option(form.ListValue, 'role', '角色');
        o.value('1', roles['1']);
        o.value('2', roles['2']);
        o.value('3', roles['3']);
        o.default = '1';
        o.textvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'role') || this.default;
            return roles[value];
        };
        o.cfgvalue = function (section_id) {
            var value = uci.get('rpcd', section_id, 'role');
            disabledComponent(section_id, 'role');
            return value;
        };
        o.write = function (section_id) {
            var value = this.formvalue(section_id);
            uci.set('rpcd', section_id, 'role', value);
            setRole(section_id, value);
            console.log('role.section_id: ', section_id, value);
        };

        const mRender = await m.render();

        var checked = data[2].checked;
        return E('div', {}, [
            E('h2', { name: 'content' }, _('LuCI Logins')),
            E('div', { style: 'display: flex;align-items: center;padding: 10px 0;' }, [
                E('span', { style: 'margin-right: 10px;font-weight: bold' }, '开启双重认证：'),
                E('input', {
                    id: 'dualAuthCheck',
                    type: 'checkbox',
                    [checked ? 'checked' : 'c']: '',
                    change: ui.createHandlerFn(this, 'authChange')
                }),
            ]),
            mRender
        ]);
    },
    hideNotiEvent() {
        document.getElementById('maincontent').addEventListener('click', function (e) {
            var target = e.target;
            if (target.className == 'btn' && target.innerHTML == '关闭') {
                setTimeout(() => {
                    e.target.parentNode.parentNode.remove();
                }, 300);
            }
        });
    },
    authChange: async function (e) {
        var checked = e.target.checked ? '1' : '0';
        var form = new FormData();
        form.append('checked', checked);
        var res = await request.post(baseUrl + '/dual_auth', form);
        if (res.responseText) {
            var resJson = JSON.parse(res.responseText);
            if (resJson.status == 'error') {
                this.showToast(resJson.msg);
                document.getElementById('dualAuthCheck').checked = false;
            }
        }
    },
    getAuthChecked: async function () {
        var res = await request.get(baseUrl + '/dual_auth_checked');
        if (res.responseText) {
            var resJson = JSON.parse(res.responseText);
            return {
                checked: resJson.checked == '1' ? true : false
            };
        }
        return {
            checked: false
        };
    },
    showToast(msg, type = 'warning') {
        // type : info/success/warning
        document.querySelector('#maincontent .alert-message') && document.querySelector('#maincontent .alert-message').remove();
        ui.addNotification('提示', E('p', msg), type);
    },
});
