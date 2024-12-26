new Vue({
    el: '#app',
    data() {
        return {
            username: '',
            siteName: '',
            staffList: [],
            addStaffDialogVisible: false,
            editPermissionsDialogVisible: false,
            staffForm: {
                username: '',
                permissions: []
            },
            editPermissionsForm: {
                id: null,
                permissions: []
            },
            permissionLabels: {
                'ORDER': '接单权限',
                'DELIVERY': '配送权限',
                'ORDER_MANAGE': '订单管理权限',
                'MENU_MANAGE': '菜单管理权限',
                'ADDRESS_MANAGE': '地址管理权限'
            }
        }
    },
    created() {
        this.checkAuth();
        this.loadStaffList();
    },
    methods: {
        async checkAuth() {
            try {
                const response = await axios.get('/api/auth/check');
                this.username = response.data.username;
                this.siteName = response.data.site_name;
                
                // 如果不是管理员,跳转回主���
                if (!response.data.is_admin) {
                    this.$message.error('没有权限访问此页面');
                    window.location.href = '/static/shop.html';
                }
            } catch (error) {
                this.$message.error('请先登录');
                window.location.href = '/static/login.html';
            }
        },
        async loadStaffList() {
            try {
                const response = await axios.get('/api/staff');
                this.staffList = response.data;
            } catch (error) {
                this.$message.error('加载员工列表失败');
            }
        },
        showAddStaffDialog() {
            this.staffForm = {
                username: '',
                permissions: []
            };
            this.addStaffDialogVisible = true;
        },
        async addStaff() {
            try {
                await axios.post('/api/staff', this.staffForm);
                this.$message.success('添加员工成功');
                this.addStaffDialogVisible = false;
                this.loadStaffList();
            } catch (error) {
                this.$message.error(error.response?.data?.detail || '添加员工失败');
            }
        },
        showEditPermissionsDialog(staff) {
            this.editPermissionsForm = {
                id: staff.id,
                permissions: [...staff.permissions]
            };
            this.editPermissionsDialogVisible = true;
        },
        async updatePermissions() {
            try {
                await axios.put(`/api/staff/${this.editPermissionsForm.id}/permissions`, {
                    permissions: this.editPermissionsForm.permissions
                });
                this.$message.success('更新权限成功');
                this.editPermissionsDialogVisible = false;
                this.loadStaffList();
            } catch (error) {
                this.$message.error('更新权限失败');
            }
        },
        async removeStaff(staff) {
            try {
                await this.$confirm('确认移除该员工?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
                
                await axios.delete(`/api/staff/${staff.id}`);
                this.$message.success('移除成功');
                this.loadStaffList();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('移除失败');
                }
            }
        },
        goBack() {
            window.location.href = '/static/shop.html';
        },
        async logout() {
            try {
                await axios.post('/api/auth/logout');
                window.location.href = '/static/login.html';
            } catch (error) {
                this.$message.error('退出失败');
            }
        }
    }
}); 