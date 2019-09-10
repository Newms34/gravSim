//TODO: delete (merge!) objects when they get too close.
var app = angular
    .module("gravapp", [])
    .controller("grav-cont", function($scope, $interval) {
        $scope.w = $(window).width();
        $scope.h = $(window).height();
        $scope.ticks = 0;
        $scope.numPlans = 15;
        $scope.maxSize = 100;
        $scope.maxSpd = 2;
        $scope.g = 0.1;
        $scope.timer = null;
        $scope.sunStatus = false;
        $scope.mSun = 200;
        $scope.canv = document.querySelector('#canv').getContext("2d");
        $scope.rescatter = function() {
            $scope.plans = [];
            $scope.hidePlans = false;
            for (var i = 0; i < $scope.numPlans; i++) {
                $scope.plans.push(new $scope.newPlan());
            }
            $scope.plans.forEach(function(pl) {
                pl.x = Math.floor(Math.random() * $scope.w);
                pl.y = Math.floor(Math.random() * $scope.h);
                pl.dx = Math.random() - 0.5;
                pl.dy = Math.random() - 0.5;
            });
            $scope.timer = $interval(function() {
                $scope.ticks++;
                var numPlans = $scope.plans.length;
                var stopped = false;
                //loop thru each planet
                for (var i = 0; i < numPlans; i++) {
                    if (!$scope.plans[i]) {
                        return false;
                    }
                    //border reflection stuff
                    if (!$scope.plans[i]) {
                        return false;
                    }
                    if ($scope.plans[i].x + $scope.plans[i].dx < 0 || $scope.plans[i].x + $scope.plans[i].dx > $scope.w) {
                        $scope.plans[i].dx *= -1;
                    }
                    if ($scope.plans[i].y + $scope.plans[i].dy < 0 || $scope.plans[i].y + $scope.plans[i].dy > $scope.h) {
                        $scope.plans[i].dy *= -1;
                    }
                    $scope.plans[i].x += $scope.plans[i].dx;
                    $scope.plans[i].y += $scope.plans[i].dy;
                    //now we adjust gravity by comparing the location and mass of each planet
                    for (var j = 0; j < numPlans; j++) {
                        if (i == j) {
                            //same planet; continue
                            continue;
                        }
                        // do we need to deal with cases where the planets have the same x and/or y coords?
                        if (!$scope.plans[i] || !$scope.plans[j]) {
                            console.log('comparing', $scope.plans[i], 'and', $scope.plans[j])
                        }
                        var grav = $scope.getGrav($scope.plans[i], $scope.plans[j]);
                        if (grav && grav != false && grav != 'false') {
                            //objects NOT merged, so we can just continue;
                        } else {
                            stopped = true;
                            console.log('Objects', $scope.plans[i], 'and', $scope.plans[j], 'merged!');
                            $scope.plans[i] = $scope.combine($scope.plans[i], $scope.plans[j]);
                            $scope.plans.splice(j, 1);
                            break;
                        }
                    }
                    if ($scope.sunStatus) {
                        //sun active, so do that
                        var grav = $scope.getGrav($scope.plans[i], $scope.sun, true);
                        if (!grav || grav == 'false') {
                            //collision with sun
                            $scope.plans.splice(i, 1);
                            stopped = true;
                        }
                    }
                    if ($scope.pathMode) {
                        $scope.canv.globalCompositeOperation = "screen";
                        $scope.canv.fillStyle = `hsla(${60*$scope.plans[i].m/$scope.maxSize},100%,${100*$scope.plans[i].m/$scope.maxSize}%,.2)`;
                        var lineWid = Math.ceil($scope.plans[i].m / 8);
                        $scope.canv.fillRect($scope.plans[i].x + (0.05 * $scope.plans[i].m), $scope.plans[i].y + (0.05 * $scope.plans[i].m), lineWid, lineWid);
                    }
                    if (stopped) {
                        break;
                    }
                }
                if ($scope.ticks % 5 == 0) {
                    $scope.canv.globalCompositeOperation = "multiply";
                    $scope.canv.fillStyle = 'rgba(0,0,0,0.1)';
                    $scope.canv.fillRect(0, 0, $scope.w, $scope.h);
                }
                if ($scope.plans.length < 2 || ($scope.sunStatus && !$scope.plans.length)) {
                    $interval.cancel($scope.timer);
                    bootbox.alert({
                        title: 'System Crashed!',
                        message: 'Your system has only one particle left!'
                    })
                }
            }, 50);
        };
        $scope.getGrav = function(s, d, isSun) {
            //distance (r) btwn objects
            //returns false if objects are too close (colided)

            //first, let's make sure the objects being compared to not share x or y coords.
            //do we need this?
            // if (s.x == d.x) {
            //     d = angular.copy(d);
            //     d.x += .01;
            // }
            // if (s.y == d.y) {
            //     d = angular.copy(d);
            //     d.y += .01;
            // }
            var halfS = 10 * s.m / $scope.maxSize;

            if (isSun) {
                var halfD = $scope.sun.m / 2;
            } else {
                var halfD = 10 * d.m / $scope.maxSize;
            }
            var dist = Math.sqrt(
                Math.pow(Math.abs((s.x) - (d.x)), 2) + Math.pow(Math.abs((s.y) - (d.y)), 2)
            );

            if (dist < ((halfS) + (halfD))) {
                console.log('COLLIDE! DIST IS:', dist, 'MIN RANGE IS', ((halfS) + (halfD)));
                return false;
            }
            //the scalar component of the gravity to be added.
            var gravDirect = $scope.g * d.m / Math.pow(dist, 2);
            var angle = Math.atan(Math.abs(s.y - d.y) / Math.abs(s.x - d.x));
            //adjust angle as appropriate. Aaaaaa
            if (s.x >= d.x && s.y <= d.y) {
                //do nothing (upper right)
            } else if (s.x < d.x && s.y <= d.y) {
                //upper left
                angle = Math.PI - angle;
            } else if (s.x >= d.x && s.y > d.y) {
                //bottom right
                angle = (2 * Math.PI) - angle;
            } else {
                angle = Math.PI + angle;
            }
            angle = (2 * Math.PI) - angle;
            //dirs
            s.dx -= gravDirect * Math.cos(angle);
            s.dy -= gravDirect * Math.sin(angle);
            s.dx = Math.min(20, s.dx);
            s.dy = Math.min(20, s.dy);
            return s;
        };
        $scope.noBubble = function(e) {
            // e.preventDefault();
            e.stopPropagation();
        }
        $scope.mouse = { x: 0, y: 0 }
        $scope.mousey = function(e) {
            $scope.mouse.x = e.clientX;
            $scope.mouse.y = e.clientY;
        }
        $scope.moving = false;
        $scope.toggleMove = function(e) {
            if ($scope.moving) {
                //put down particle
                $scope.moving.x = e.clientX;
                $scope.moving.y = e.clientY;
                console.log("re-adding", $scope.moving)
                $scope.plans.push(angular.copy($scope.moving));
                $scope.moving = false;
            } else {
                console.log(e.target.id.slice(2), e)
                var id = e.target.id.slice(2);
                console.log($scope.plans.length)
                $scope.moving = $scope.plans.splice(id, 1)[0];
                console.log($scope.plans.length)
            }
        }
        $scope.combine = function(s, a) {
            //inelastic collision btwn planets.
            //s is the output (and Source obj). a is the addon (which is deleted!)
            if (a.m > s.m) {
                var temp = angular.copy(a);
                a = angular.copy(s);
                s = angular.copy(temp);
            }

            var kei = {
                x: (s.m * 0.5 * Math.pow(s.dx, 2)) + ((a.m * 0.5 * Math.pow(a.dx, 2))),
                y: (s.m * 0.5 * Math.pow(s.dy, 2)) + ((a.m * 0.5 * Math.pow(a.dy, 2)))
            }; //initial total kinetic energy of the system

            var kef = {
                x: 0.7 * kei.x / (s.m + a.m),
                y: 0.7 * kei.y / (s.m + a.m)
            };
            //total final kinetic energy
            console.log('COLLISION:', s, a, kei, kef);
            s.dx = kef.x;
            s.dy = kef.y;
            s.m += (a.m * 0.7);
            return s;
        };
        $scope.newPlan = function() {
            this.x = Math.floor(Math.random() * $scope.w);
            this.y = Math.floor(Math.random() * $scope.h);
            this.dx = (Math.random()*$scope.maxSpd) - (0.5*$scope.maxSpd);
            this.dy = (Math.random()*$scope.maxSpd) - (0.5*$scope.maxSpd);
            this.m = ($scope.maxSize * 0.1) + Math.floor(Math.random() * ($scope.maxSize - ($scope.maxSize * 0.1))); //random from 10 to 99
        };
        $scope.explSun = function() {
            bootbox.alert({
                title: 'Including a Sun',
                message: `Check this box to include a sun. The sun: <ul><li>Can be any size</li><li>Will always be in the middle of your 'system'.</li><li>Is indestructable. Anything coliding with it will be destroyed, regardless of mass ratio.</li></ul>`
            })
        };
        $scope.plans = [];
        $scope.Math = Math;
        $scope.getStyles = (m, isSun) => {
            //return: width, height, background col, box shadow based on mass
            var styles = '';
            //width & height: 20% of the mass max.
            if (isSun) {
                styles += `width:${$scope.maxSize}px;height:${$scope.maxSize}px;`;
            } else {

                styles += `width:${20*m/$scope.maxSize}px;height:${20*m/$scope.maxSize}px;`;
            }
            //bg color: h is 60 * percent 
            styles += `background:hsl(${60*m/$scope.maxSize},100%,${100*m/$scope.maxSize}%);`;
            //and finally box shadow
            styles += `box-shadow:0 0 ${Math.ceil(m/5)}px ${Math.ceil(m/10)}px hsl(${60*m/$scope.maxSize},100%,${100*m/$scope.maxSize}%);`;
            return styles;
        };
        $scope.toggleSun = () => {
            console.log('sun status', $scope.useSun);
            $scope.sunStatus = $scope.useSun;
            if ($scope.useSun) {
                $scope.sun = {
                    m: $scope.mSun,
                    x: ($scope.w / 2) - ($scope.mSun / 2),
                    y: ($scope.h / 2) - ($scope.mSun / 2)
                }
            }
        }
    });

/*m 99. width = 19.8.  max size:100
actual wid = 20*perc
*/