new Vue({
    el: '#app',
    data() {
        return {
            username: '',
            siteName: '',
            isAdmin: false,
            permissions: [],
            communities: [],
            addCommunityDialogVisible: false,
            editCommunityDialogVisible: false,
            addBuildingDialogVisible: false,
            editBuildingDialogVisible: false,
            buildingAddMode: 'single',
            communityForm: {
                name: '',
                address: '',
                note: ''
            },
            editCommunityForm: {
                id: null,
                name: '',
                address: '',
                note: ''
            },
            buildingForm: {
                name: '',
                note: '',
                startNum: 1,
                endNum: 1,
                suffix: '号楼'
            },
            editBuildingForm: {
                id: null,
                name: '',
                note: ''
            },
            currentCommunity: null
        }
    },
    created() {
        this.checkAuth();
        this.loadCommunities();
    },
    methods: {
        async checkAuth() {
            try {
                const response = await axios.get('/api/auth/check');
                this.username = response.data.username;
                this.siteName = response.data.site_name;
                this.isAdmin = response.data.is_admin;
                this.permissions = response.data.permissions || [];
            } catch (error) {
                this.$message.error('请先登录');
                window.location.href = '/static/login.html';
            }
        },
        canManageAddress() {
            return this.isAdmin || this.permissions.includes('ADDRESS_MANAGE');
        },
        async loadCommunities() {
            try {
                const response = await axios.get('/api/communities');
                this.communities = response.data;
            } catch (error) {
                this.$message.error('加载小区列表失败');
            }
        },
        showAddCommunityDialog() {
            this.communityForm = {
                name: '',
                address: '',
                note: ''
            };
            this.addCommunityDialogVisible = true;
        },
        async createCommunity() {
            try {
                await axios.post('/api/communities', this.communityForm);
                this.$message.success('添加小区成功');
                this.addCommunityDialogVisible = false;
                this.loadCommunities();
            } catch (error) {
                this.$message.error(error.response?.data?.detail || '添加小区失败');
            }
        },
        showEditCommunityDialog(community) {
            this.editCommunityForm = {
                id: community.id,
                name: community.name,
                address: community.address,
                note: community.note
            };
            this.editCommunityDialogVisible = true;
        },
        async updateCommunity() {
            try {
                await axios.put(`/api/communities/${this.editCommunityForm.id}`, this.editCommunityForm);
                this.$message.success('更新小区成功');
                this.editCommunityDialogVisible = false;
                this.loadCommunities();
            } catch (error) {
                this.$message.error('更新小区失败');
            }
        },
        async deleteCommunity(community) {
            try {
                await this.$confirm('确认删除该小区?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
                
                await axios.delete(`/api/communities/${community.id}`);
                this.$message.success('删除成功');
                this.loadCommunities();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败');
                }
            }
        },
        showAddBuildingDialog(community) {
            this.currentCommunity = community;
            this.buildingForm = {
                name: '',
                note: '',
                startNum: 1,
                endNum: 1,
                suffix: '号楼'
            };
            this.buildingAddMode = 'single';
            this.addBuildingDialogVisible = true;
        },
        async createBuilding() {
            try {
                if (this.buildingAddMode === 'single') {
                    await axios.post(`/api/communities/${this.currentCommunity.id}/buildings`, {
                        name: this.buildingForm.name,
                        note: this.buildingForm.note
                    });
                } else {
                    // 批量添加
                    const buildings = [];
                    for (let i = this.buildingForm.startNum; i <= this.buildingForm.endNum; i++) {
                        buildings.push({
                            name: `${i}${this.buildingForm.suffix}`,
                            note: this.buildingForm.note
                        });
                    }
                    await axios.post(`/api/communities/${this.currentCommunity.id}/buildings/batch`, {
                        buildings
                    });
                }
                
                this.$message.success('添加楼栋成功');
                this.addBuildingDialogVisible = false;
                this.loadCommunities();
            } catch (error) {
                this.$message.error(error.response?.data?.detail || '添加楼栋失败');
            }
        },
        showEditBuildingDialog(community, building) {
            this.currentCommunity = community;
            this.editBuildingForm = {
                id: building.id,
                name: building.name,
                note: building.note
            };
            this.editBuildingDialogVisible = true;
        },
        async updateBuilding() {
            try {
                await axios.put(
                    `/api/communities/${this.currentCommunity.id}/buildings/${this.editBuildingForm.id}`,
                    this.editBuildingForm
                );
                this.$message.success('更新楼栋成功');
                this.editBuildingDialogVisible = false;
                this.loadCommunities();
            } catch (error) {
                this.$message.error('更新楼栋失败');
            }
        },
        async deleteBuilding(community, building) {
            try {
                await this.$confirm('确认删除该楼栋?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
                
                await axios.delete(`/api/communities/${community.id}/buildings/${building.id}`);
                this.$message.success('删除成功');
                this.loadCommunities();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败');
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